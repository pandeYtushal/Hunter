import { useState, useEffect, useRef } from "react";
import { ConversationManager } from "./ConversationManager";
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
    }
    init();
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const selectConversation = (id: string) => {
    setActiveId(id);
    setError("");
  };

  const createConversation = async (title = "New Conversation") => {
    const newConv = await ConversationManager.createConversation(title);
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setError("");
    return newConv;
  };

  const deleteConversation = async (id: string) => {
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
  };

  const clearCurrentConversation = async () => {
    if (!activeId) return;
    const cleared = await ConversationManager.clearConversation(activeId);
    if (cleared) {
      setConversations((prev) => prev.map((c) => (c.id === activeId ? cleared : c)));
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

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : input).trim();
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
    await ConversationManager.updateConversationMessages(activeId, updatedMessages);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: updatedMessages } : c))
    );

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
      selectedText: "",
      screenshotBase64: null,
      longTermMemory: null,
      currentGoal: null,
      currentAgent: null,
      profile: null
    };

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

    // 4. AI Routing: If attachments contain images/screenshots, route to Vision.
    const hasImages = currentAttachments.some((a) => a.type === "image" || a.type === "screenshot");

    if (hasImages) {
      // Vision pipeline
      const primaryImage = currentAttachments.find((a) => a.type === "image" || a.type === "screenshot")!;
      
      const assistantMsgPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: "thinking",
        content: "Hunter is analyzing screenshot and extracting layout elements...",
        createdAt: new Date().toISOString()
      };

      const withThinking = [...updatedMessages, assistantMsgPlaceholder];
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, messages: withThinking } : c))
      );

      try {
        const response = await AIManager.getInstance().vision({
          prompt: userPrompt,
          imageBufferOrBase64: primaryImage.base64Data,
          mimeType: primaryImage.mimeType,
          goal: finalContext.currentGoal || "Analyze page layout"
        });

        // Parse suggested actions out of elements
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
        await ConversationManager.updateConversationMessages(activeId, finalMessages);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, messages: finalMessages } : c))
        );

        // Store response & vision results in conversation memory
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
        await ConversationManager.updateConversationMessages(activeId, finalMessages);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, messages: finalMessages } : c))
        );
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Standard streaming Chat pipeline
      const abortCtrl = streamingManagerRef.current.start();
      
      const assistantMsgPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: "thinking",
        content: "",
        createdAt: new Date().toISOString()
      };

      let currentStreamContent = "";
      const withThinking = [...updatedMessages, assistantMsgPlaceholder];
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, messages: withThinking } : c))
      );

      // Map conversation logs to provider history format
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
            
            // Keep editing placeholder message with streamed content
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
        await ConversationManager.updateConversationMessages(activeId, finalMessages);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, messages: finalMessages } : c))
        );

        // Store generated response in conversation memory
        await ConversationMemory.addGeneratedResponse(activeId, assistantMsgId, userPrompt, response.text);

        // Parse if it extracted job details, match resume, research or cover letters to store in memory
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
        await ConversationManager.updateConversationMessages(activeId, finalMessages);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, messages: finalMessages } : c))
        );
      } finally {
        streamingManagerRef.current.stop();
        setIsGenerating(false);
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
    await ConversationManager.updateConversationMessages(activeId, trimmedMessages);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: trimmedMessages } : c))
    );

    // Resend user prompt
    await sendMessage(precedingUserMsg.content);
  };

  const editPromptAndRetry = async (messageId: string, newText: string) => {
    if (!activeId || !activeConversation) return;
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    // Remove this user message and all messages following it
    const trimmedMessages = activeConversation.messages.slice(0, msgIndex);
    await ConversationManager.updateConversationMessages(activeId, trimmedMessages);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: trimmedMessages } : c))
    );

    // Send edited prompt
    await sendMessage(newText);
  };

  const addMessageToHistory = async (role: MessageRole, content: string) => {
    if (!activeId || !activeConversation) return;
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      createdAt: new Date().toISOString()
    };
    const updatedMessages = [...activeConversation.messages, newMsg];
    await ConversationManager.updateConversationMessages(activeId, updatedMessages);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: updatedMessages } : c))
    );
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
    addMessageToHistory
  };
}
