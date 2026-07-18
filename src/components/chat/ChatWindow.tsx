import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Terminal, X, AlertTriangle, CheckCircle2, XCircle,
  Compass, ChevronDown, ChevronUp, MousePointerClick, MessageSquare
} from "lucide-react";
import { useChatController } from "../../chat/ChatController";
import { ChatHeader } from "./ChatHeader";
import { Button } from "../ui/button";
import { MessageBubble } from "./MessageBubble";
import { AttachmentPreview } from "./AttachmentPreview";
import { PromptSuggestions, getDynamicSuggestions } from "./PromptSuggestions";
import { ChatInput } from "./ChatInput";
import { DragDropZone } from "./DragDropZone";
import { TypingIndicator } from "./TypingIndicator";
import { ContextBar } from "./ContextBar";
import { ConversationHistory } from "./ConversationHistory";
import { CopilotEngine, type CopilotState } from "../../copilot/CopilotEngine";
import { ProfileSettings } from "../../sidebar/ProfileSettings";
import { VoiceWave } from "./VoiceWave";
import { storage } from "../../shared/storage";
import { resolveTheme } from "../../shared/theme";
import { useChromeStorage } from "../../popup/hooks/useChromeStorage";
import { useTheme } from "../../popup/hooks/useTheme";
import { shouldActQuery } from "../../ai/planner";

const ALLOWED_PARENT_ORIGINS = [
  "https://linkedin.com",
  "https://www.linkedin.com",
  "https://indeed.com",
  "https://www.indeed.com",
  "https://github.com",
  "https://www.github.com",
  "https://mail.google.com",
  "https://leetcode.com",
  "https://www.leetcode.com",
  "https://stackoverflow.com",
  "https://www.stackoverflow.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000"
];

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

const detectWorkspaceMode = (prompt: string): string | null => {
  const lower = prompt.toLowerCase();

  if (
    lower.includes("apply") ||
    lower.includes("resume") ||
    lower.includes("cover letter") ||
    lower.includes("job match") ||
    lower.includes("missing skills") ||
    lower.includes("profile match") ||
    lower.includes("job search")
  ) {
    return "job_search";
  }

  if (
    lower.includes("research") ||
    lower.includes("competitor") ||
    lower.includes("financials") ||
    lower.includes("revenue") ||
    lower.includes("leadership") ||
    lower.includes("company stats")
  ) {
    return "research";
  }

  if (
    lower.includes("buy") ||
    lower.includes("price") ||
    lower.includes("checkout") ||
    lower.includes("discount") ||
    lower.includes("deal") ||
    lower.includes("coupon") ||
    lower.includes("shop")
  ) {
    return "shopping";
  }

  if (
    lower.includes("learn") ||
    lower.includes("study") ||
    lower.includes("explain") ||
    lower.includes("concept") ||
    lower.includes("definition") ||
    lower.includes("syllabus")
  ) {
    return "learning";
  }

  if (
    lower.includes("email") ||
    lower.includes("draft email") ||
    lower.includes("send to") ||
    lower.includes("meeting schedule") ||
    lower.includes("formal mail")
  ) {
    return "email";
  }

  if (
    lower.includes("travel") ||
    lower.includes("flight") ||
    lower.includes("hotel") ||
    lower.includes("itinerary") ||
    lower.includes("reservation") ||
    lower.includes("trip")
  ) {
    return "travel";
  }

  if (
    lower.includes("contract") ||
    lower.includes("summarize document") ||
    lower.includes("pdf summary") ||
    lower.includes("invoice") ||
    lower.includes("document context") ||
    lower.includes("clause")
  ) {
    return "documents";
  }

  return null;
};

// Intent classification is now delegated to shouldActQuery imported from planner.ts

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
    addMessageToHistory,
    togglePinConversation
  } = useChatController();

  const { value: approvalState } = useChromeStorage("approvalState");
  const { theme, setTheme } = useTheme();
  const [devModeOpen, setDevModeOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copilotExpanded, setCopilotExpanded] = useState(false);
  const [forceChatMode, setForceChatMode] = useState(false);
  const { setValue: setActiveMode } = useChromeStorage("activeWorkspaceMode");
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [liveAgentActive, setLiveAgentActive] = useState(false);
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

    let targetOrigin = "*";
    if (currentUrl) {
      try {
        const origin = new URL(currentUrl).origin;
        if (ALLOWED_PARENT_ORIGINS.includes(origin)) {
          targetOrigin = origin;
        } else {
          console.warn("Parent origin not in allowlist:", origin);
          return;
        }
      } catch (e) {
        console.error("Failed to parse parent origin:", e);
        return;
      }
    } else {
      return;
    }

    window.parent.postMessage(
      {
        source: "ai-job-agent-sidebar",
        type: "SET_EXPANDED",
        expanded: nextExpanded
      },
      targetOrigin
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
  const threadRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  // Subscribe to Copilot Engine State
  useEffect(() => {
    const unsubscribe = CopilotEngine.getInstance().subscribe((state) => {
      setCopilot(state);
      // Auto-expand when approval is needed
      if (state.machineState === "waiting_confirmation") {
        setCopilotExpanded(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleThreadScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  }, []);

  // Scroll to bottom only when user is already near the bottom
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, isGenerating, copilot.timeline]);

  // Reset force-chat when input cleared
  useEffect(() => {
    if (!input.trim()) setForceChatMode(false);
  }, [input]);

  const prevMachineStateRef = useRef<string>("idle");

  useEffect(() => {
    if (copilot.machineState === "completed" && prevMachineStateRef.current !== "completed") {
      if (copilot.lastResult) {
        addMessageToHistory("assistant", formatCopilotResult(copilot.lastResult));
      } else {
        addMessageToHistory("assistant", `Goal completed successfully: "${copilot.currentGoal}"`);
      }

      // Auto-done finished goals when in live continuous conversation session
      if (liveAgentActive) {
        const timeoutId = setTimeout(() => {
          CopilotEngine.getInstance().cancel();
        }, 1500);
        return () => clearTimeout(timeoutId);
      }
    } else if (copilot.machineState === "failed" && prevMachineStateRef.current !== "failed") {
      addMessageToHistory(
        "error",
        copilot.blockReason || copilot.lastResult || "Hunter could not continue this autonomous goal."
      );
    }
    prevMachineStateRef.current = copilot.machineState;
  }, [copilot.machineState, copilot.lastResult, copilot.currentGoal, copilot.blockReason, liveAgentActive]);

  const handleCopyMessage = useCallback((text: string) => {
    // MessageBubble already handles navigator.clipboard.writeText internally
    console.log("Message copied to clipboard:", text.slice(0, 30) + "...");
  }, []);

  const processQuery = async (query: string, opts: { isFromSuggestion: boolean; forceChat?: boolean }) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery && attachments.length === 0) return;

    if (opts.isFromSuggestion) {
      setInput(query);
    }

    const detected = detectWorkspaceMode(trimmedQuery);
    if (detected && setActiveMode) {
      await setActiveMode(detected);
    }

    const useAct = shouldActQuery(trimmedQuery) && !opts.forceChat && !forceChatMode;

    if (useAct) {
      setInput("");
      setForceChatMode(false);
      stickToBottomRef.current = true;
      setCopilotExpanded(false);
      await addMessageToHistory("user", trimmedQuery);
      try {
        await CopilotEngine.getInstance().startGoal(trimmedQuery);
      } catch (err: any) {
        const message = err?.message || "Hunter could not start autonomous mode.";
        setError(message);
        await addMessageToHistory("error", message);
      }
    } else {
      setForceChatMode(false);
      stickToBottomRef.current = true;
      if (opts.isFromSuggestion) {
        await sendMessage(trimmedQuery);
        setInput("");
      } else {
        await sendMessage();
      }
    }
  };

  const handleSend = async (val?: string) => {
    const query = typeof val === "string" ? val : input;
    await processQuery(query, { isFromSuggestion: false });
  };

  const handleSendFromSuggestion = async (prompt: string) => {
    await processQuery(prompt, { isFromSuggestion: true });
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

  const willAct =
    Boolean(input.trim()) &&
    shouldActQuery(input.trim()) &&
    !forceChatMode &&
    !isGenerating &&
    !isCopilotRunning;

  const emptySuggestions = getDynamicSuggestions(currentUrl).slice(0, 3);
  const lastMessageId =
    activeConversation && activeConversation.messages.length > 0
      ? activeConversation.messages[activeConversation.messages.length - 1].id
      : null;

  const activeTimelineStep = copilot.timeline.find(
    (s) => s.status === "running" || s.status === "waiting_confirmation"
  );

  return (
    <div className="chat-shell flex h-full w-full text-[var(--text-primary)] font-sans overflow-hidden relative">
      <ConversationHistory
        open={historyOpen}
        conversations={conversations}
        activeId={activeId}
        onClose={() => setHistoryOpen(false)}
        onSelect={selectConversation}
        onCreate={() => {
          void createConversation();
        }}
        onDelete={(id) => {
          void deleteConversation(id);
        }}
        onTogglePin={(id) => {
          void togglePinConversation(id);
        }}
      />

      {/* Main Panel Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-[var(--bg-primary)] bg-[radial-gradient(ellipse_80%_85%_at_50%_-20%,rgba(var(--accent-rgb),0.035),transparent)]">
        <ChatHeader
          currentUrl={currentUrl || undefined}
          activeGoal={copilot.machineState !== "idle" ? copilot.currentGoal : null}
          provider={devMetrics.selectedProvider}
          theme={resolveTheme(theme)}
          isExpanded={isExpanded}
          onToggleTheme={() => {
            const nextTheme = resolveTheme(theme) === "dark" ? "light" : "dark";
            void setTheme(nextTheme);
          }}
          onClearChat={clearCurrentConversation}
          onToggleProfile={() => setShowProfile(true)}
          onToggleExpand={handleToggleExpand}
          onOpenHistory={() => setHistoryOpen(true)}
          onNewChat={() => {
            void createConversation();
          }}
        />

        <div className="flex-grow flex-1 min-h-0 relative flex flex-col">
          {/* Live Voice Visualizer Overlay */}
          {liveAgentActive && (
            <VoiceWave
              onClose={() => setLiveAgentActive(false)}
              transcript={input}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0">
            <DragDropZone onDropFile={attachFile}>
              {/* Messages Thread Log */}
              <div
                ref={threadRef}
                onScroll={handleThreadScroll}
                className="chat-thread flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar bg-transparent"
              >
                {!activeConversation || activeConversation.messages.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in space-y-6 max-w-sm mx-auto h-full justify-self-center py-10">
                    {/* Brand Greeting */}
                    <div className="space-y-3 flex flex-col items-center relative w-full">
                      <div className="absolute -top-10 h-32 w-32 bg-gradient-to-tr from-[var(--accent)]/10 via-[var(--accent-strong)]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--accent)] shadow-md mb-1 transition-all duration-300 hover:scale-105 hover:border-[var(--accent-dim)]">
                        <Compass size={22} className="animate-spin-slow" style={{ animationDuration: "24s" }} />
                      </div>
                      <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
                        How can I assist you?
                      </h2>
                      <p className="text-[12.5px] text-[var(--text-muted)] font-normal leading-relaxed max-w-[260px] mx-auto">
                        Ask about this page, or tell Hunter to act — apply, research, or autofill.
                      </p>
                    </div>

                    {/* Page-aware suggestions (top 3) */}
                    <div className="w-full space-y-2 text-left">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                        Suggested
                      </span>
                      <div className="grid grid-cols-1 gap-2 w-full">
                        {emptySuggestions.map((s) => {
                          const Icon = s.icon;
                          const isAct = shouldActQuery(s.prompt);
                          return (
                            <button
                              key={s.prompt}
                              onClick={() => handleSendFromSuggestion(s.prompt)}
                              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition duration-150 cursor-pointer group shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                                <span className="truncate">{s.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 select-none">
                                <span className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors ${
                                  isAct
                                    ? "text-[var(--accent)] border-[var(--accent-dim)] bg-[var(--accent-faint)]"
                                    : "text-[var(--text-muted)] border-[var(--border-color)] bg-[var(--bg-tertiary)] group-hover:text-[var(--accent)]"
                                }`}>
                                  {isAct ? "Act" : "Ask"}
                                </span>
                                <span className="text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-transform duration-150">{"→"}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  activeConversation.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onCopy={handleCopyMessage}
                      onRegenerate={regenerateResponse}
                      onEditAndRetry={editPromptAndRetry}
                      isGenerating={isGenerating || isCopilotRunning}
                      devModeOpen={devModeOpen}
                      forceShowActions={msg.id === lastMessageId && !isGenerating && !isCopilotRunning}
                    />
                  ))
                )}

                {/* Fallback thinking indicator before assistant placeholder lands */}
                {isGenerating &&
                  activeConversation &&
                  activeConversation.messages.length > 0 &&
                  activeConversation.messages[activeConversation.messages.length - 1].role === "user" && (
                    <TypingIndicator />
                  )}

                <div ref={messagesEndRef} />
              </div>
            </DragDropZone>
          </div>
        </div>

        {/* Error Notification Bar */}
        {error && (
          <div className="mx-4 my-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 flex items-center gap-2 text-xs font-medium text-rose-500 select-none animate-scale-up">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="flex-1 truncate">{error}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setError("")}
              className="p-1 h-6 w-6 rounded hover:bg-rose-900/20 text-rose-500 hover:text-white transition cursor-pointer"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </Button>
          </div>
        )}

        {/* Collapsible Copilot status */}
        {copilot.machineState !== "idle" && (
          <div className={`mx-4 my-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-md animate-[scale-up_0.2s_ease-out] select-none overflow-hidden ${
            copilot.machineState === "executing" || copilot.machineState === "planning"
              ? "animate-accent-pulse"
              : ""
          }`}>
            {/* Compact bar */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setCopilotExpanded((v) => !v)}
                className="flex flex-1 min-w-0 items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer text-left"
                aria-expanded={copilotExpanded}
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${
                  copilot.machineState === "failed"
                    ? "bg-rose-500"
                    : copilot.machineState === "completed"
                      ? "bg-emerald-500"
                      : "bg-[var(--accent)] animate-pulse"
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                      {copilot.currentGoal || "Running goal"}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[var(--accent)] shrink-0 tabular-nums">
                      {copilot.progress}%
                    </span>
                  </div>
                  {!copilotExpanded && activeTimelineStep && (
                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 animate-shimmer-soft">
                      {activeTimelineStep.name || activeTimelineStep.description}
                    </p>
                  )}
                </div>
                {copilotExpanded ? (
                  <ChevronUp size={14} className="text-[var(--text-muted)] shrink-0" />
                ) : (
                  <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" />
                )}
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {copilot.machineState === "executing" && (
                  <button
                    type="button"
                    onClick={() => CopilotEngine.getInstance().pause()}
                    className="h-7 px-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-secondary)] cursor-pointer"
                  >
                    Pause
                  </button>
                )}
                {copilot.machineState === "paused" && (
                  <button
                    type="button"
                    onClick={() => CopilotEngine.getInstance().resume()}
                    className="h-7 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold border-0 cursor-pointer"
                  >
                    Resume
                  </button>
                )}
                {copilot.machineState === "completed" ? (
                  <button
                    type="button"
                    onClick={() => CopilotEngine.getInstance().cancel()}
                    className="h-7 px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold border-0 cursor-pointer"
                  >
                    Done
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => CopilotEngine.getInstance().cancel()}
                    className="h-7 px-2 rounded-lg border border-rose-500/35 text-rose-400 text-[10px] font-semibold bg-transparent cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Thin progress line + shimmer while running */}
            <div className="h-1 bg-[var(--bg-tertiary)]">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  copilot.machineState === "completed"
                    ? "bg-emerald-500"
                    : copilot.machineState === "failed"
                      ? "bg-rose-500"
                      : "progress-shimmer-bar"
                }`}
                style={{ width: `${Math.max(copilot.progress, 4)}%` }}
              />
            </div>

            {/* Expanded details */}
            {copilotExpanded && (
              <div className="p-3 space-y-3 border-t border-[var(--border-color)]">
                <div className="relative pl-5 border-l border-[var(--border-color)] ml-2 space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar text-[11px] font-mono leading-relaxed">
                  {copilot.timeline.map((step) => {
                    const isRunning = step.status === "running" || step.status === "waiting_confirmation";
                    const isCompleted = step.status === "completed";
                    const isFailed = step.status === "failed";

                    return (
                      <div
                        key={step.id}
                        className={`relative flex items-start gap-2 ${isRunning ? "step-row-enter" : ""}`}
                      >
                        <div className="absolute -left-[21px] top-[3px] flex items-center justify-center z-10">
                          {isCompleted ? (
                            <CheckCircle2 size={12} className="text-emerald-500 step-check-pop" />
                          ) : isFailed ? (
                            <XCircle size={12} className="text-rose-500 step-check-pop" />
                          ) : isRunning ? (
                            <div className="h-2.5 w-2.5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                          ) : (
                            <div className="h-2.5 w-2.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)]" />
                          )}
                        </div>
                        <span className={`font-semibold text-left transition-colors duration-200 ${
                          isCompleted
                            ? "text-[var(--text-muted)] line-through opacity-75"
                            : isRunning
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)]"
                        }`}>
                          {isCompleted || !isRunning ? step.name : step.description.replace(/^🧠\s*/, "")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {((copilot.machineState === "waiting_confirmation") || (approvalState && approvalState.status === "pending")) && (
                  <div className="p-3 rounded-xl border border-[var(--accent-dim)] bg-[var(--accent-faint)] space-y-2.5 text-left">
                    <p className="text-[11px] font-bold text-[var(--accent)] flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      Safety Approval Required
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                      {copilot.machineState === "waiting_confirmation"
                        ? copilot.pendingConfirmationMessage || "Hunter has paused before a protected action. Do you approve?"
                        : approvalState?.message}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (copilot.machineState === "waiting_confirmation") {
                            CopilotEngine.getInstance().approve();
                          } else if (approvalState) {
                            await storage.set("approvalState", { ...approvalState, status: "approved" });
                          }
                        }}
                        className="flex-1 h-7 rounded bg-[var(--accent)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer border-0"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (copilot.machineState === "waiting_confirmation") {
                            CopilotEngine.getInstance().skip();
                          } else if (approvalState) {
                            await storage.set("approvalState", { ...approvalState, status: "declined" });
                          }
                        }}
                        className="flex-1 h-7 rounded border border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-mono uppercase transition cursor-pointer bg-transparent"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}

                {copilot.machineState === "failed" && (
                  <button
                    type="button"
                    onClick={() => CopilotEngine.getInstance().retry()}
                    className="w-full h-8 rounded-lg bg-[var(--accent)] text-white text-[11px] font-bold uppercase cursor-pointer border-0"
                  >
                    Retry Failed Step
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Suggestion chips — only when idle input and not generating */}
        {activeConversation &&
          activeConversation.messages.length > 0 &&
          !isGenerating &&
          !isCopilotRunning &&
          !input.trim() && (
          <div className="px-4 py-0.5 shrink-0">
            <PromptSuggestions currentUrl={currentUrl} onSelect={handleSendFromSuggestion} />
          </div>
        )}

        {/* Upload Thumbnails Row */}
        <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

        {/* Act-mode preview banner */}
        {willAct && (
          <div className="mx-4 mb-1.5 flex items-center gap-2 rounded-lg border border-[var(--accent-dim)] bg-[var(--accent-faint)] px-3 py-2 text-[11px] animate-fade-in select-none">
            <MousePointerClick size={13} className="text-[var(--accent)] shrink-0" />
            <span className="flex-1 text-[var(--text-secondary)] text-left">
              <strong className="text-[var(--accent)]">Act mode:</strong> Hunter will automate the browser
            </span>
            <button
              type="button"
              onClick={() => setForceChatMode(true)}
              className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Send as a normal chat reply instead"
            >
              <MessageSquare size={11} />
              Ask instead
            </button>
          </div>
        )}

        {forceChatMode && input.trim() && shouldActQuery(input.trim()) && (
          <div className="mx-4 mb-1.5 flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[11px] animate-fade-in select-none">
            <MessageSquare size={13} className="text-[var(--text-muted)] shrink-0" />
            <span className="flex-1 text-[var(--text-secondary)] text-left">
              Sending as <strong>chat</strong> (won&apos;t control the browser)
            </span>
            <button
              type="button"
              onClick={() => setForceChatMode(false)}
              className="shrink-0 text-[10px] font-semibold text-[var(--accent)] bg-transparent border-0 cursor-pointer"
            >
              Use Act
            </button>
          </div>
        )}

        {/* Standard input footer area */}
        <>
          <ContextBar
            currentUrl={currentUrl}
            hasAttachments={attachments.length > 0}
            hasMemory={Boolean(activeConversation?.messages.length)}
            browserControlEnabled={Boolean(currentUrl)}
            activeGoal={copilot.machineState !== "idle" ? copilot.currentGoal : undefined}
          />
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
              } catch (err: any) {
                const msg = "Failed to reconstruct image from pasted attachment.";
                console.error(msg, err);
                setError(msg);
              }
            }}
            liveAgentActive={liveAgentActive}
            onToggleLiveAgent={() => setLiveAgentActive(!liveAgentActive)}
          />
        </>

        {/* Developer Mode Drawer panel */}
        {devModeOpen && (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-[11.5px] font-mono leading-relaxed select-text max-h-[200px] overflow-y-auto custom-scrollbar animate-fade-in shadow-inner">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2 mb-3">
              <h3 className="font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={12} />
                Developer Console Metrics
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDevModeOpen(false)}
                className="p-1 h-6 w-6 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer animate-none"
                aria-label="Close Developer Console"
              >
                <X size={14} />
              </Button>
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
                <span className={`font-bold uppercase ${devMetrics.streamingStatus === "streaming"
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