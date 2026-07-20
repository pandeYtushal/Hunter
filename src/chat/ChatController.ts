import { useState, useEffect, useRef } from "react";
import { ConversationManager, LIST_KEY } from "./ConversationManager";
import { ChatContext } from "./ChatContext";
import { AttachmentManager } from "./AttachmentManager";
import { StreamingManager } from "./StreamingManager";
import { PromptComposer } from "./PromptComposer";
import { ConversationMemory } from "./ConversationMemory";
import { AIManager } from "../ai/core/AIManager";
import { storage } from "../shared/storage";
import type { ChatConversation, ChatMessage, ChatAttachment, DeveloperMetrics, MessageRole } from "./ChatTypes";

export function useChatController() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  
  const [devMetrics, setDevMetrics] = useState<DeveloperMetrics>({
    selectedProvider: "gemini",
    visionProvider: "gemini",
    contextSize: 0,
    prompt: "",
    streamingStatus: "idle",
    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  });

  const attachmentManagerRef = useRef(new AttachmentManager());
  const streamingManagerRef = useRef(new StreamingManager());

  // Load initial settings and conversations list
  useEffect(() => {
    async function init() {
      try {
        const list = await ConversationManager.getConversations();
        setConversations(list);
        if (list.length > 0) {
          setActiveId(list[0].id);
        } else {
          const newConv = await ConversationManager.createConversation();
          setConversations([newConv]);
          setActiveId(newConv.id);
        }

        // Load active provider names
        const settings = await storage.get("settings").catch(() => null);
        setDevMetrics((prev) => ({
          ...prev,
          selectedProvider: settings?.provider || "gemini",
          visionProvider: settings?.visionProvider || settings?.provider || "gemini"
        }));
      } catch (err: any) {
        setError(err.message || "Failed to initialize conversation history.");
      }
    }
    init();
  }, []);

  // Listen for storage changes to sync conversations across UI instances or remounts
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes[LIST_KEY]) {
        const newList: ChatConversation[] = changes[LIST_KEY].newValue || [];
        setConversations(newList);
        
        setActiveId((prevId) => {
          if (!prevId && newList.length > 0) return newList[0].id;
          if (prevId && !newList.some((c) => c.id === prevId)) {
            return newList.length > 0 ? newList[0].id : null;
          }
          return prevId;
        });
      }
    };

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const selectConversation = (id: string) => {
    setActiveId(id);
    setError("");
  };

  const createConversation = async (title = "New Conversation") => {
    try {
      const newConv = await ConversationManager.createConversation(title);
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newConv.id);
      setError("");
      return newConv;
    } catch (err: any) {
      setError(err.message || "Failed to create conversation.");
      throw err;
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const updated = await ConversationManager.deleteConversation(id);
      setConversations(updated);
      if (activeId === id) {
        if (updated.length > 0) {
          setActiveId(updated[0].id);
        } else {
          const newConv = await ConversationManager.createConversation();
          setConversations([newConv]);
          setActiveId(newConv.id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete conversation.");
    }
  };

  const clearCurrentConversation = async () => {
    if (!activeId) return;
    try {
      const cleared = await ConversationManager.clearConversation(activeId);
      if (cleared) {
        setConversations((prev) => prev.map((c) => (c.id === activeId ? cleared : c)));
      }
    } catch (err: any) {
      setError(err.message || "Failed to clear conversation.");
    }
  };

  const attachFile = async (file: File) => {
    setError("");
    try {
      const att = await attachmentManagerRef.current.addFile(file);
      setAttachments([...attachmentManagerRef.current.getAttachments()]);
      
      // Store upload in conversation memory
      if (activeId) {
        await ConversationMemory.addUploadedImage(activeId, att.id, att.name, `data:${att.mimeType};base64,${att.base64Data}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to attach image.");
    }
  };

  const captureScreen = async () => {
    setError("");
    try {
      const att = await attachmentManagerRef.current.addScreenshot();
      setAttachments([...attachmentManagerRef.current.getAttachments()]);
      
      if (activeId) {
        await ConversationMemory.addUploadedImage(activeId, att.id, att.name, `data:${att.mimeType};base64,${att.base64Data}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to capture browser screenshot.");
    }
  };

  const removeAttachment = (id: string) => {
    attachmentManagerRef.current.removeAttachment(id);
    setAttachments([...attachmentManagerRef.current.getAttachments()]);
  };

  const stopGeneration = () => {
    streamingManagerRef.current.stop();
    setIsGenerating(false);
    setDevMetrics((prev) => ({ ...prev, streamingStatus: "completed" }));
  };

  const sendMessage = async (textToSend?: unknown) => {
    let resolvedText: string | undefined;
    if (typeof textToSend === "string") {
      resolvedText = textToSend;
    } else if (textToSend !== undefined && textToSend !== null) {
      console.warn("sendMessage received non-string argument, falling back to input state:", textToSend);
      resolvedText = undefined;
    }

    const query = (resolvedText !== undefined ? resolvedText : input).trim();
    if (!query && attachments.length === 0) return;
    if (!activeId || !activeConversation) return;

    setError("");
    setIsGenerating(true);
    setInput("");

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();
    const currentAttachments = [...attachments];
    
    // Clear pending attachments array
    attachmentManagerRef.current.clear();
    setAttachments([]);

    // 1. Append user message locally
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    const updatedMessages = [...activeConversation.messages, newUserMsg];
    try {
      const updated = await ConversationManager.updateConversationMessages(activeId, updatedMessages);
      if (updated) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? updated : c))
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to save message.");
      setIsGenerating(false);
      return;
    }

    // 2. Fetch runtime context
    let context = null;
    try {
      context = await ChatContext.gatherContext();
    } catch (err) {
      console.warn("Failed to collect context:", err);
    }

    const finalContext = context || {
      currentUrl: "",
      pageSnapshot: null,
      browserStateModel: null,
      selectedText: "",
      screenshotBase64: null,
      longTermMemory: null,
      currentGoal: null,
      currentAgent: null,
      profile: null
    };

    const assistantMsgPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: "thinking",
      content: "Extracting browser state model...",
      createdAt: new Date().toISOString()
    };

    const withThinking = [...updatedMessages, assistantMsgPlaceholder];
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: withThinking } : c))
    );

    // Call AIManager to determine if goal can be completed automatically
    let canAutomate = false;
    let plannedActions: any[] = [];
    let verificationCriteria = "";

    if (finalContext.browserStateModel) {
      try {
        const decisionPrompt = `You are Hunter, an experienced browser intelligence assistant.
Analyze the user's request and the current Browser State Model, and plan the next steps.

USER GOAL: "${query}"

BROWSER STATE MODEL:
${JSON.stringify(finalContext.browserStateModel, null, 2)}

DECIDE:
1. Can the user's goal be completed automatically? (set "canAutomate" to true or false)
2. Which browser actions are required? (provide a list of actions under "actions". Available actions: click_element, fill_input, scroll_page, navigate_page, upload_resume, wait)
3. How can success be verified? (description in "verification")

When matching elements on LinkedIn, Gmail, GitHub, Indeed, LeetCode, or Notion, behave like an experienced human using the website. Avoid generic patterns. Select specific page element selectors/text you see in the model.

OUTPUT FORMAT:
You MUST output exactly in the following JSON format and nothing else:
{
  "canAutomate": true,
  "actions": [
    { "type": "click_element", "selector": "#selector", "text": "Apply", "reason": "Reason for action" }
  ],
  "verification": "Check if apply modal is open"
}
If the request is a simple question or description that does not require browser actions, or if it cannot be automated, set "canAutomate" to false and "actions" to [].`;

        const decisionResponse = await AIManager.getInstance().chat({
          prompt: decisionPrompt,
          history: [],
          systemInstruction: "You are a precise browser automation planner. You output ONLY valid JSON."
        });

        const cleanJson = decisionResponse.text.trim().replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed && typeof parsed === "object") {
          canAutomate = !!parsed.canAutomate;
          plannedActions = Array.isArray(parsed.actions) ? parsed.actions : [];
          verificationCriteria = parsed.verification || "";
        }
      } catch (e) {
        console.warn("Failed to parse automation decision:", e);
      }
    }

    if (canAutomate && plannedActions.length > 0) {
      // Execute Planned Actions Loop: Goal -> Plan -> Execute -> Observe -> Verify -> Continue
      let currentModel = finalContext.browserStateModel;
      let actionIndex = 0;
      let executionFailed = false;
      let failureReason = "";

      for (const action of plannedActions) {
        const currentStepDescription = `Running step ${actionIndex + 1}/${plannedActions.length}: ${action.type.replace(/_/g, " ")} ${action.selector ? `on "${action.selector}"` : ""} ${action.text ? `matching "${action.text}"` : ""} ${action.value ? `with value "${action.value}"` : ""}`;
        
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeId) {
              const msgs = c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: currentStepDescription } : m
              );
              return { ...c, messages: msgs };
            }
            return c;
          })
        );

        let actionSuccess = false;
        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts && !actionSuccess) {
          attempt++;
          try {
            let response: any = null;
            if (action.type === "click_element") {
              response = await chrome.runtime.sendMessage({
                type: "SEND_TO_ACTIVE_TAB",
                message: { type: "CLICK_ELEMENT", selector: action.selector, text: action.text }
              });
            } else if (action.type === "fill_input") {
              response = await chrome.runtime.sendMessage({
                type: "SEND_TO_ACTIVE_TAB",
                message: { type: "FILL_INPUT", selector: action.selector, value: action.value }
              });
            } else if (action.type === "scroll_page") {
              response = await chrome.runtime.sendMessage({
                type: "SEND_TO_ACTIVE_TAB",
                message: { type: "SCROLL_PAGE", direction: action.direction || "down" }
              });
            } else if (action.type === "navigate_page") {
              response = await chrome.runtime.sendMessage({
                type: "SEND_TO_ACTIVE_TAB",
                message: { type: "NAVIGATE_PAGE", url: action.url }
              });
            } else if (action.type === "upload_resume") {
              response = await chrome.runtime.sendMessage({
                type: "SEND_TO_ACTIVE_TAB",
                message: { type: "UPLOAD_RESUME" }
              });
            } else if (action.type === "wait") {
              await new Promise(resolve => setTimeout(resolve, action.ms || 1000));
              response = { ok: true };
            }

            if (response && response.ok) {
              actionSuccess = true;
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (err: any) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }

        if (!actionSuccess) {
          executionFailed = true;
          failureReason = `Failed to execute action: ${action.type}`;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
        currentModel = await ChatContext.requestBrowserStateModel();

        if (currentModel) {
          try {
            const verifyPrompt = `Verify the outcome of the action:
Action: ${JSON.stringify(action)}
Success Criterion: "${verificationCriteria}"

Fresh Browser State Model:
${JSON.stringify(currentModel, null, 2)}

Did the action succeed? Return JSON format:
{
  "success": true/false,
  "explanation": "..."
}`;

            const verifyResponse = await AIManager.getInstance().chat({
              prompt: verifyPrompt,
              history: [],
              systemInstruction: "You are a precise browser state verifier. You output ONLY valid JSON."
            });

            const verifyJson = verifyResponse.text.trim().replace(/```json/g, "").replace(/```/g, "").trim();
            const verifyParsed = JSON.parse(verifyJson);
            if (verifyParsed && typeof verifyParsed === "object" && !verifyParsed.success) {
              console.warn("Verification failed, attempting adjustment or retry...", verifyParsed.explanation);
            }
          } catch (e) {
            console.warn("Failed to verify step:", e);
          }
        }

        actionIndex++;
      }

      const finalPrompt = `You have completed the browser automation steps for the user's goal: "${query}".
Actions performed:
${JSON.stringify(plannedActions, null, 2)}

Final Browser State:
${JSON.stringify(currentModel, null, 2)}

Write a friendly, professional, website-specific response to the user detailing the outcome of the actions, behaving like an experienced human.`;

      try {
        const finalReply = await AIManager.getInstance().chat({
          prompt: finalPrompt,
          history: [],
          systemInstruction: "You are Hunter, a helpful browser agent. Explain what you did naturally, like a human."
        });

        const finalMsg: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: finalReply.text,
          createdAt: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, finalMsg];
        await ConversationManager.updateConversationMessages(activeId, finalMessages);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, messages: finalMessages } : c))
        );
      } catch (err: any) {
        setError(err.message || "Failed to generate final reply.");
      } finally {
        setIsGenerating(false);
      }

    } else {
      // 3. Compose prompt
      const systemInstruction = PromptComposer.composeSystemInstruction(finalContext);
      const userPrompt = PromptComposer.composeUserPrompt(query, finalContext, currentAttachments.length);

      // Update developer panel prompt & context size estimate
      const contextSizeEstimate = Math.round((systemInstruction.length + userPrompt.length) / 4);
      setDevMetrics((prev) => ({
        ...prev,
        prompt: userPrompt,
        contextSize: contextSizeEstimate,
        streamingStatus: "streaming"
      }));

      const hasImages = currentAttachments.some((a) => a.type === "image" || a.type === "screenshot");

      if (hasImages) {
        // Vision pipeline
        const primaryImage = currentAttachments.find((a) => a.type === "image" || a.type === "screenshot")!;
        
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeId) {
              const msgs = c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: "Hunter is analyzing screenshot and extracting layout elements..." } : m
              );
              return { ...c, messages: msgs };
            }
            return c;
          })
        );

        try {
          const response = await AIManager.getInstance().vision({
            prompt: userPrompt,
            imageBufferOrBase64: primaryImage.base64Data,
            mimeType: primaryImage.mimeType,
            goal: finalContext.currentGoal || "Analyze page layout"
          });

          const actions = (response.elements || [])
            .filter((el) => el.importance === "high" || el.type === "cta")
            .map((el) => `Click "${el.text}" (${el.type})`);

          const finalAssistantMsg: ChatMessage = {
            id: assistantMsgId,
            role: "vision",
            content: response.text || "Vision analysis complete.",
            createdAt: new Date().toISOString(),
            metadata: {
              model: response.model,
              provider: response.provider,
              detectedElements: response.elements,
              confidence: response.confidence,
              suggestedActions: actions
            }
          };

          const finalMessages = [...updatedMessages, finalAssistantMsg];
          const updated = await ConversationManager.updateConversationMessages(activeId, finalMessages);
          if (updated) {
            setConversations((prev) =>
              prev.map((c) => (c.id === activeId ? updated : c))
            );
          }

          await ConversationMemory.addGeneratedResponse(activeId, assistantMsgId, userPrompt, response.text);
          if (response.elements) {
            await ConversationMemory.addVisionResult(activeId, assistantMsgId, response.elements.length, response.confidence || 0.9);
          }

          setDevMetrics((prev) => ({
            ...prev,
            streamingStatus: "completed",
            tokenUsage: response.tokensUsed || prev.tokenUsage
          }));

        } catch (err: any) {
          setError(err.message || "Vision query failed.");
          const errorMsg: ChatMessage = {
            id: assistantMsgId,
            role: "error",
            content: err.message || "Vision analysis failed.",
            createdAt: new Date().toISOString()
          };
          const finalMessages = [...updatedMessages, errorMsg];
          try {
            const updated = await ConversationManager.updateConversationMessages(activeId, finalMessages);
            if (updated) {
              setConversations((prev) =>
                prev.map((c) => (c.id === activeId ? updated : c))
              );
            }
          } catch (e) {
            console.error("Failed to save vision error message:", e);
          }
        } finally {
          setIsGenerating(false);
        }
      } else {
        // Standard streaming Chat pipeline
        const abortCtrl = streamingManagerRef.current.start();
        
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === activeId) {
              const msgs = c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: "Streaming response..." } : m
              );
              return { ...c, messages: msgs };
            }
            return c;
          })
        );

        let currentStreamContent = "";
        const history = updatedMessages.slice(0, -1).map((m) => ({
          id: m.id,
          role: m.role === "user" ? "user" as const : "assistant" as const,
          content: m.content,
          createdAt: m.createdAt
        }));

        try {
          const response = await AIManager.getInstance().streamChat(
            {
              prompt: userPrompt,
              systemInstruction,
              history,
              temperature: 0.7
            },
            (chunk) => {
              if (abortCtrl.signal.aborted) return;
              currentStreamContent += chunk;
              
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id === activeId) {
                    const msgs = c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, role: "assistant" as MessageRole, content: currentStreamContent }
                        : m
                    );
                    return { ...c, messages: msgs };
                  }
                  return c;
                })
              );
            }
          );

          if (abortCtrl.signal.aborted) {
            setIsGenerating(false);
            return;
          }

          const finalAssistantMsg: ChatMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: response.text,
            createdAt: new Date().toISOString(),
            metadata: {
              model: response.model,
              provider: response.provider,
              tokensUsed: response.tokensUsed
            }
          };

          const finalMessages = [...updatedMessages, finalAssistantMsg];
          const updated = await ConversationManager.updateConversationMessages(activeId, finalMessages);
          if (updated) {
            setConversations((prev) =>
              prev.map((c) => (c.id === activeId ? updated : c))
            );
          }

          await ConversationMemory.addGeneratedResponse(activeId, assistantMsgId, userPrompt, response.text);

          if (response.text.includes("{") && response.text.includes("}")) {
            try {
              const parsed = JSON.parse(response.text.substring(response.text.indexOf("{"), response.text.lastIndexOf("}") + 1));
              if (parsed.title && parsed.company) {
                await ConversationMemory.addDetectedJob(activeId, parsed.title, parsed.company, parsed);
              }
              if (parsed.matchScore !== undefined) {
                await ConversationMemory.addResumeAnalysis(activeId, "Uploaded Profile", parsed.matchScore, parsed);
              }
              if (parsed.companyOverview) {
                await ConversationMemory.addResearchResult(activeId, parsed.company || "Target", parsed);
              }
            } catch (e) {
              // Not a parsable memory JSON
            }
          }

          setDevMetrics((prev) => ({
            ...prev,
            streamingStatus: "completed",
            tokenUsage: response.tokensUsed || prev.tokenUsage
          }));

        } catch (err: any) {
          if (abortCtrl.signal.aborted) return;
          setError(err.message || "Streaming query failed.");
          const errorMsg: ChatMessage = {
            id: assistantMsgId,
            role: "error",
            content: err.message || "Streaming failed.",
            createdAt: new Date().toISOString()
          };
          const finalMessages = [...updatedMessages, errorMsg];
          try {
            const updated = await ConversationManager.updateConversationMessages(activeId, finalMessages);
            if (updated) {
              setConversations((prev) =>
                prev.map((c) => (c.id === activeId ? updated : c))
              );
            }
          } catch (e) {
            console.error("Failed to save streaming error message:", e);
          }
        } finally {
          streamingManagerRef.current.stop();
          setIsGenerating(false);
        }
      }
    }
  };

  const regenerateResponse = async (messageId: string) => {
    if (!activeId || !activeConversation) return;
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Find the user prompt preceding this response
    const precedingUserMsg = activeConversation.messages
      .slice(0, msgIndex)
      .reverse()
      .find((m) => m.role === "user");

    if (!precedingUserMsg) return;

    // Remove this assistant message and all messages after it
    const trimmedMessages = activeConversation.messages.slice(0, msgIndex);
    try {
      const updated = await ConversationManager.updateConversationMessages(activeId, trimmedMessages);
      if (updated) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? updated : c))
        );
      }
      // Resend user prompt
      await sendMessage(precedingUserMsg.content);
    } catch (err: any) {
      setError(err.message || "Failed to regenerate response.");
    }
  };

  const editPromptAndRetry = async (messageId: string, newText: string) => {
    if (!activeId || !activeConversation) return;
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Remove this user message and all messages following it
    const trimmedMessages = activeConversation.messages.slice(0, msgIndex);
    try {
      const updated = await ConversationManager.updateConversationMessages(activeId, trimmedMessages);
      if (updated) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? updated : c))
        );
      }
      // Send edited prompt
      await sendMessage(newText);
    } catch (err: any) {
      setError(err.message || "Failed to edit message.");
    }
  };

  const addMessageToHistory = async (role: MessageRole, content: unknown) => {
    if (!activeId || !activeConversation) return;

    let resolvedContent = "";
    if (typeof content === "string") {
      resolvedContent = content;
    } else if (content !== undefined && content !== null) {
      console.error("addMessageToHistory received non-string content:", content);
      try {
        resolvedContent = typeof content === "object" ? JSON.stringify(content) : String(content);
      } catch (e) {
        resolvedContent = "[Unrenderable Content]";
      }
    }

    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content: resolvedContent,
      createdAt: new Date().toISOString()
    };
    const updatedMessages = [...activeConversation.messages, newMsg];
    try {
      const updated = await ConversationManager.updateConversationMessages(activeId, updatedMessages);
      if (updated) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? updated : c))
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to save message to history.");
    }
  };

  const togglePinConversation = async (id: string) => {
    try {
      const updated = await ConversationManager.togglePinConversation(id);
      setConversations(updated);
    } catch (err: any) {
      setError(err.message || "Failed to toggle pin.");
    }
  };

  return {
    conversations,
    activeId,
    activeConversation,
    attachments,
    input,
    isGenerating,
    error,
    setError,
    devMetrics,
    setInput,
    sendMessage,
    regenerateResponse,
    editPromptAndRetry,
    stopGeneration,
    attachFile,
    captureScreen,
    removeAttachment,
    selectConversation,
    createConversation,
    deleteConversation,
    clearCurrentConversation,
    addMessageToHistory,
    togglePinConversation
  };
}
