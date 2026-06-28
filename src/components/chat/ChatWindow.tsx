import React, { useState, useRef, useEffect } from "react";
import { 
  Terminal, X, AlertTriangle, Search, Zap, Globe, Keyboard, Clock, 
  Sparkles, HelpCircle, Activity, MousePointer, CheckCircle2, XCircle
} from "lucide-react";
import { useChatController } from "../../chat/ChatController";
import { ChatHeader } from "./ChatHeader";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageBubble } from "./MessageBubble";
import { AttachmentPreview } from "./AttachmentPreview";
import { PromptSuggestions, getDynamicSuggestions } from "./PromptSuggestions";
import { ChatInput } from "./ChatInput";
import { DragDropZone } from "./DragDropZone";
import { TypingIndicator } from "./TypingIndicator";
import { CopilotEngine, type CopilotState } from "../../copilot/CopilotEngine";
import { ProfileSettings } from "../../sidebar/ProfileSettings";
import { storage } from "../../shared/storage";
import { resolveTheme } from "../../shared/theme";
import { useChromeStorage } from "../../popup/hooks/useChromeStorage";
import { useTheme } from "../../popup/hooks/useTheme";

const getStepIcon = (name: string, description: string) => {
  const text = (name + " " + description).toLowerCase();
  if (text.includes("click")) return MousePointer;
  if (text.includes("type") || text.includes("fill") || text.includes("input")) return Keyboard;
  if (text.includes("search") || text.includes("find") || text.includes("extract") || text.includes("scan")) return Search;
  if (text.includes("navigate") || text.includes("go to") || text.includes("url") || text.includes("open")) return Globe;
  if (text.includes("wait") || text.includes("sleep") || text.includes("delay")) return Clock;
  if (text.includes("apply")) return Zap;
  return Activity;
};

function formatCopilotResult(result: string): string {
  if (!result) return "";
  try {
    const parsed = JSON.parse(result);
    if (parsed && typeof parsed === "object") {
      if (parsed.type === "research_result") {
        return `### Company Research: ${parsed.company}\n\n**Overview:**\n${parsed.overview}\n\n**Key Products:**\n${parsed.products}\n\n**Interview Tips:**\n${parsed.recommendations || parsed.interviewTips || ""}`;
      }
      if (parsed.coverLetter) {
        return `### Tailored Cover Letter Draft\n\n${parsed.coverLetter}`;
      }
      if (parsed.type === "autofill_confirmation") {
        return `### Autofill Scan Complete\n\nDetected and prepared fields: \n${(parsed.fields || []).map((f: any) => `- **${f.mappedType}** (selector: \`${f.fieldId}\`)`).join("\n")}`;
      }
      if (parsed.matchScore !== undefined) {
        return `### Profile Match Analysis\n\n**Match Score:** ${parsed.matchScore}%\n\n**Matched Skills:**\n${(parsed.matchedSkills || []).map((s: string) => `- ${s}`).join("\n") || "None"}\n\n**Missing Skills:**\n${(parsed.missingSkills || []).map((s: string) => `- ${s}`).join("\n") || "None"}\n\n**Recommendations:**\n${parsed.recommendations || ""}`;
      }
      if (parsed.title && parsed.company) {
        return `### Job Details Extracted\n\n- **Role:** ${parsed.title}\n- **Company:** ${parsed.company}\n- **Location:** ${parsed.location || "Unknown"}\n- **Salary:** ${parsed.salary || "Unknown"}\n- **Skills:** ${(parsed.skills || []).join(", ") || "None"}`;
      }
    }
  } catch {
    // Not JSON, return as is
  }
  return result;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export const ChatWindow: React.FC = () => {
  const {
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
  } = useChatController();

  const { value: approvalState } = useChromeStorage("approvalState");
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [devModeOpen, setDevModeOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copilot, setCopilot] = useState<CopilotState>({
    machineState: "idle",
    currentGoal: "",
    tasks: [],
    progress: 0,
    timeline: [],
    isBlocked: false,
    estimatedCompletionTimeSeconds: 0
  });

  const handleToggleExpand = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    window.parent.postMessage(
      {
        source: "ai-job-agent-sidebar",
        type: "SET_EXPANDED",
        expanded: nextExpanded
      },
      "*"
    );
  };

  // Track active tab URL dynamically
  useEffect(() => {
    const updateUrl = () => {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        try {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab?.url) {
              setCurrentUrl(tab.url);
            }
          });
        } catch (e) {
          console.warn("Failed to get active tab URL:", e);
        }
      }
    };
    updateUrl();

    if (typeof chrome !== "undefined" && chrome.tabs) {
      const handleActivated = () => updateUrl();
      const handleUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changeInfo.url) {
          updateUrl();
        }
      };

      chrome.tabs.onActivated.addListener(handleActivated);
      chrome.tabs.onUpdated.addListener(handleUpdated);

      return () => {
        chrome.tabs.onActivated.removeListener(handleActivated);
        chrome.tabs.onUpdated.removeListener(handleUpdated);
      };
    }
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to Copilot Engine State
  useEffect(() => {
    const unsubscribe = CopilotEngine.getInstance().subscribe((state) => {
      setCopilot(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, isGenerating, copilot.timeline]);

  const prevMachineStateRef = useRef<string>("idle");

  useEffect(() => {
    if (copilot.machineState === "completed" && prevMachineStateRef.current !== "completed") {
      if (copilot.lastResult) {
        addMessageToHistory("assistant", formatCopilotResult(copilot.lastResult));
      } else {
        addMessageToHistory("assistant", `Goal completed successfully: "${copilot.currentGoal}"`);
      }
      CopilotEngine.getInstance().cancel();
    }
    prevMachineStateRef.current = copilot.machineState;
  }, [copilot.machineState, copilot.lastResult, copilot.currentGoal]);

  const handleCopyMessage = (text: string) => {
    console.log("Message copied");
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query && attachments.length === 0) return;

    const lower = query.toLowerCase();
    const isGoalMode =
      lower.includes("apply") ||
      lower.includes("research") ||
      lower.includes("prepare") ||
      lower.includes("fill") ||
      lower.includes("find") ||
      lower.includes("save") ||
      lower.includes("summarize") ||
      lower.includes("help me");

    if (isGoalMode) {
      setInput("");
      await addMessageToHistory("user", query);
      await CopilotEngine.getInstance().startGoal(query);
    } else {
      await sendMessage();
    }
  };

  const handleSendFromSuggestion = async (prompt: string) => {
    setInput(prompt);
    const lower = prompt.toLowerCase();
    const isGoalMode =
      lower.includes("apply") ||
      lower.includes("research") ||
      lower.includes("prepare") ||
      lower.includes("fill") ||
      lower.includes("find") ||
      lower.includes("save") ||
      lower.includes("summarize") ||
      lower.includes("help me");

    if (isGoalMode) {
      setInput("");
      await addMessageToHistory("user", prompt);
      await CopilotEngine.getInstance().startGoal(prompt);
    } else {
      await sendMessage(prompt);
      setInput("");
    }
  };

  const handleStop = () => {
    if (copilot.machineState !== "idle") {
      CopilotEngine.getInstance().cancel();
    } else {
      stopGeneration();
    }
  };

  const isCopilotRunning =
    copilot.machineState === "executing" ||
    copilot.machineState === "waiting_confirmation" ||
    copilot.machineState === "paused" ||
    copilot.machineState === "planning";

  if (showProfile) {
    return <ProfileSettings onBack={() => setShowProfile(false)} />;
  }

  return (
    <div className="chat-shell flex h-full w-full text-[var(--text-primary)] font-sans overflow-hidden relative">
      {/* Collapsible Left Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={sidebarOpen}
        onSelect={selectConversation}
        onCreate={createConversation}
        onDelete={deleteConversation}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Panel Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <ChatHeader
          currentUrl={currentUrl || undefined}
          activeGoal={copilot.machineState !== "idle" ? copilot.currentGoal : activeConversation && activeConversation.messages.length > 0 ? "Automated browser goal" : null}
          provider={devMetrics.selectedProvider}
          theme={resolveTheme(theme)}
          isSidebarOpen={sidebarOpen}
          isExpanded={isExpanded}
          onToggleTheme={() => {
            const nextTheme = resolveTheme(theme) === "dark" ? "light" : "dark";
            void setTheme(nextTheme);
          }}
          onToggleSidebar={() => {
            console.log("onToggleSidebar clicked. Current sidebarOpen state:", sidebarOpen);
            setSidebarOpen((open) => !open);
          }}
          onClearChat={clearCurrentConversation}
          onToggleProfile={() => setShowProfile(true)}
          onToggleExpand={handleToggleExpand}
        />

        {/* Drag and Drop wrapper */}
        <DragDropZone onDropFile={attachFile}>
          {/* Messages Thread Log */}
          <div className="chat-thread flex-1 overflow-y-auto px-1 py-2 space-y-1 custom-scrollbar bg-transparent">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in space-y-5 max-w-sm mx-auto h-full justify-self-center">
                
                {/* Brand Greeting */}
                <div className="space-y-1.5">
                  <h2 className="text-[15px] font-bold tracking-normal text-[var(--text-primary)]">
                    Hunter
                  </h2>
                  <p className="text-[12.5px] text-[var(--text-muted)] font-normal leading-relaxed">
                    Ask about the current page.
                  </p>
                </div>

                {/* Page Awareness Card */}
                <div className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5 text-left space-y-2 select-none">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-normal">
                    <span>Current page</span>
                    <span className="text-[var(--text-muted)] flex items-center gap-1.5 font-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                      Connected
                    </span>
                  </div>
                  <div className="text-[12px] font-normal text-[var(--text-primary)] truncate">
                    {currentUrl ? currentUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0] : "Page analyzed"}
                  </div>
                </div>

                {/* Quick actions wrapper */}
                <div className="w-full space-y-2 text-left">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] block mb-1 select-none">
                    Suggestions
                  </span>
                  <div className="flex flex-col gap-1.5 w-full">
                    {getDynamicSuggestions(currentUrl).map((act, i) => {
                      const Icon = act.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSendFromSuggestion(act.prompt)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon size={12} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                            <span className="truncate">{act.label}</span>
                          </div>
                          <span className="text-[10px] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity font-mono">-&gt;</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              activeConversation.messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCopy={handleCopyMessage}
                  onRegenerate={regenerateResponse}
                  onEditAndRetry={editPromptAndRetry}
                  isGenerating={isGenerating || isCopilotRunning}
                />
              ))
            )}

            {/* Typing thinking dot animation */}
            {isGenerating && activeConversation && activeConversation.messages.length > 0 && (
              activeConversation.messages[activeConversation.messages.length - 1].role === "user" && (
                <div className="px-4 py-2">
                  <TypingIndicator />
                </div>
              )
            )}

            <div ref={messagesEndRef} />
          </div>
        </DragDropZone>

        {/* Error Notification Bar */}
        {error && (
          <div className="mx-4 my-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 flex items-center gap-2 text-xs font-medium text-rose-500 select-none animate-scale-up">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="flex-1 truncate">{error}</span>
            <button
              onClick={() => setError("")}
              className="p-1 rounded hover:bg-rose-900/20 text-rose-500 hover:text-white transition cursor-pointer"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {/* Copilot Engine Timeline Progress Card Dashboard Overlay */}
        {copilot.machineState !== "idle" && (
          <div className="mx-4 my-2.5 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-lg space-y-4 animate-scale-up select-none">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-ping" />
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Autonomous Copilot Mode: {copilot.machineState}
                </h3>
              </div>
              <span className="text-[10.5px] text-[var(--text-muted)] font-mono">
                Est. completion: {copilot.estimatedCompletionTimeSeconds}s
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[13px] font-bold text-[var(--text-primary)] block">"{copilot.currentGoal}"</span>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${copilot.progress}%`,
                      background: "linear-gradient(90deg, var(--accent), var(--accent-strong))"
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold font-mono text-[var(--accent)]">{copilot.progress}%</span>
              </div>
            </div>

            {/* Timeline Steps - Redesigned premium vertical timeline */}
            <div className="relative pl-5 border-l border-[var(--border-color)] ml-3 space-y-3.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar text-[11.5px] font-mono leading-relaxed">
              {copilot.timeline.map((step) => {
                const StepIcon = getStepIcon(step.name, step.description);
                const isRunning = step.status === "running" || step.status === "waiting_confirmation";
                const isCompleted = step.status === "completed";
                const isFailed = step.status === "failed";
                
                return (
                  <div key={step.id} className="relative flex items-start justify-between gap-3 group">
                    {/* Bullet marker node with icon */}
                    <div className={`absolute -left-[27.5px] top-0.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border bg-[var(--bg-secondary)] transition-all duration-300 z-10 ${
                      isCompleted 
                        ? "border-emerald-500/50 text-emerald-500 shadow-sm" 
                        : isFailed 
                        ? "border-rose-500/50 text-rose-500 animate-pulse" 
                        : isRunning 
                        ? "border-[var(--accent)] text-[var(--accent)] shadow-md scale-110" 
                        : "border-[var(--border-color)] text-[var(--text-muted)]"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 size={10} className="stroke-[2.5]" />
                      ) : isFailed ? (
                        <XCircle size={10} className="stroke-[2.5]" />
                      ) : (
                        <StepIcon size={9} className={`${isRunning ? "animate-pulse" : ""}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold transition-all duration-200 ${
                          isCompleted 
                            ? "text-[var(--text-muted)] line-through opacity-75" 
                            : isRunning 
                            ? "text-[var(--text-primary)] font-bold" 
                            : "text-[var(--text-secondary)]"
                        }`}>
                          {step.name}
                        </span>
                        {isRunning && (
                          <span className="inline-flex items-center rounded bg-[var(--accent-faint)] px-1 py-0.25 text-[8.5px] font-bold text-[var(--accent)] uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] leading-relaxed mt-0.5 ${
                        isCompleted ? "text-[var(--text-muted)] opacity-60" : "text-[var(--text-muted)]"
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Safety Confirmation alert bar */}
            {((copilot.machineState === "waiting_confirmation") || (approvalState && approvalState.status === "pending")) && (
              <div className="p-3 rounded-xl border border-[var(--accent-dim)] bg-[var(--accent-faint)] space-y-2.5">
                <p className="text-[11px] font-bold text-[var(--accent)] flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Safety Approval Required
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {copilot.machineState === "waiting_confirmation"
                    ? "Hunter has paused before performing a critical operation (Submit, Purchase, Delete, Upload). Do you confirm?"
                    : approvalState?.message}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (copilot.machineState === "waiting_confirmation") {
                        CopilotEngine.getInstance().approve();
                      } else if (approvalState) {
                        await storage.set("approvalState", { ...approvalState, status: "approved" });
                      }
                    }}
                    className="flex-1 h-7 rounded bg-[var(--accent)] hover:opacity-90 text-white text-[10.5px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Confirm Action
                  </button>
                  <button
                    onClick={async () => {
                      if (copilot.machineState === "waiting_confirmation") {
                        CopilotEngine.getInstance().skip();
                      } else if (approvalState) {
                        await storage.set("approvalState", { ...approvalState, status: "declined" });
                      }
                    }}
                    className="flex-1 h-7 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-mono uppercase transition cursor-pointer"
                  >
                    Skip / Decline
                  </button>
                </div>
              </div>
            )}

            {/* User Control Buttons */}
            <div className="flex gap-2 border-t border-[var(--border-color)] pt-3.5">
              {copilot.machineState === "executing" ? (
                <button
                  onClick={() => CopilotEngine.getInstance().pause()}
                  className="flex-1 h-8 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[11px] font-semibold text-[var(--text-secondary)] transition cursor-pointer"
                >
                  Pause Loop
                </button>
              ) : copilot.machineState === "paused" ? (
                <button
                  onClick={() => CopilotEngine.getInstance().resume()}
                  className="flex-1 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase transition cursor-pointer"
                >
                  Resume Loop
                </button>
              ) : null}

              {copilot.machineState === "failed" && (
                <button
                  onClick={() => CopilotEngine.getInstance().retry()}
                  className="flex-1 h-8 rounded bg-[var(--accent)] hover:opacity-90 text-white text-[11px] font-bold uppercase transition cursor-pointer"
                >
                  Retry Failed Step
                </button>
              )}

              {copilot.machineState === "completed" ? (
                <button
                  onClick={() => CopilotEngine.getInstance().cancel()}
                  className="flex-1 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase transition cursor-pointer"
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={() => CopilotEngine.getInstance().cancel()}
                  className="h-8 px-3 rounded border border-rose-500/35 bg-transparent hover:bg-rose-500/10 text-rose-400 text-[11px] font-semibold transition cursor-pointer"
                >
                  Cancel Goal
                </button>
              )}
            </div>
          </div>
        )}

        {/* Suggestion Chips when chatting and not generating */}
        {activeConversation && activeConversation.messages.length > 0 && !isGenerating && !isCopilotRunning && (
          <div className="px-4 py-1 shrink-0">
            <PromptSuggestions currentUrl={currentUrl} onSelect={handleSendFromSuggestion} />
          </div>
        )}

        {/* Upload Thumbnails Row */}
        <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

        {/* Standard input footer area */}
        <ChatInput
          value={input}
          isGenerating={isGenerating || isCopilotRunning}
          onChange={setInput}
          onSend={handleSend}
          onStop={handleStop}
          onCaptureScreenshot={captureScreen}
          onAttachFile={attachFile}
          onAttachImageObject={(att) => {
            try {
              const blob = base64ToBlob(att.base64Data, att.mimeType);
              attachFile(new File([blob], att.name, { type: att.mimeType }));
            } catch (err) {
              console.error("Failed to reconstruct image from pasted attachment:", err);
            }
          }}
        />

        {/* Developer Mode Drawer panel */}
        {devModeOpen && (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-[11.5px] font-mono leading-relaxed select-text max-h-[200px] overflow-y-auto custom-scrollbar animate-fade-in shadow-inner">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2 mb-3">
              <h3 className="font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={12} />
                Developer Console Metrics
              </h3>
              <button
                onClick={() => setDevModeOpen(false)}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 text-[var(--text-secondary)]">
              <div>
                <span className="text-[var(--text-muted)] font-bold">ACTIVE CHAT PROVIDER:</span>{" "}
                <span className="text-[var(--text-primary)]">{devMetrics.selectedProvider.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] font-bold">VISION PROVIDER:</span>{" "}
                <span className="text-[var(--text-primary)]">{devMetrics.visionProvider.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] font-bold">STREAM STATUS:</span>{" "}
                <span className={`font-bold uppercase ${
                  devMetrics.streamingStatus === "streaming"
                    ? "text-[var(--accent)]"
                    : devMetrics.streamingStatus === "completed"
                    ? "text-emerald-500"
                    : "text-[var(--text-muted)]"
                }`}>
                  {devMetrics.streamingStatus}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] font-bold">CONTEXT SIZE (EST):</span>{" "}
                <span className="text-[var(--text-primary)]">{devMetrics.contextSize} Tokens</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] font-bold">TOKENS COMPLETED:</span>{" "}
                <span className="text-[var(--text-primary)]">{devMetrics.tokenUsage.completionTokens || "-"}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] font-bold">TOTAL TOKENS:</span>{" "}
                <span className="text-[var(--text-primary)]">{devMetrics.tokenUsage.totalTokens || "-"}</span>
              </div>
            </div>

            {devMetrics.prompt && (
              <div className="mt-3 pt-2.5 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] font-bold block mb-1">RAW COMPILED PROMPT SENT:</span>
                <pre className="rounded bg-[var(--bg-tertiary)] p-3 text-[10.5px] text-[var(--text-primary)] overflow-x-auto select-all max-h-24 custom-scrollbar whitespace-pre-wrap">
                  {devMetrics.prompt}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
