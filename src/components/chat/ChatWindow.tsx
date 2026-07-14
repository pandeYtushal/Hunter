import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Terminal, X, AlertTriangle, Search, Zap, Globe, Keyboard, Clock,
  Sparkles, HelpCircle, Activity, MousePointer, CheckCircle2, XCircle,
  Plus, MessageSquare, Pin, Trash2, Settings, Compass, Target,
  Check, History
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
import { CopilotEngine, type CopilotState } from "../../copilot/CopilotEngine";
import { ProfileSettings } from "../../sidebar/ProfileSettings";
import { TaskManager } from "./TaskManager";
import { WorkspaceDashboard } from "./WorkspaceDashboard";
import { WorkflowBuilder } from "./WorkflowBuilder";
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

const getStepIcon = (name: string, description: string) => {
  const text = (name + " " + description).toLowerCase();
  if (text.includes("click")) return MousePointer;
  if (text.includes("type") || text.includes("fill") || text.includes("input")) return Keyboard;
  if (text.includes("search") || text.includes("find") || text.includes("extract") || text.includes("scan")) return Search;
  if (text.includes("navigate") || text.includes("go to") || text.includes("url") || text.includes("open")) return Globe;
  if (text.includes("wait") || text.includes("sleep") || text.includes("delay")) return Clock;
  if (text.includes("apply")) return Zap;
  if (text.includes("summarize") || text.includes("analyze") || text.includes("explain")) return Compass;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "tasks" | "dashboard" | "workflows">("chat");
  const { setValue: setActiveMode } = useChromeStorage("activeWorkspaceMode");
  const [showHistory, setShowHistory] = useState(false);
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

  const processQuery = async (query: string, opts: { isFromSuggestion: boolean }) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery && attachments.length === 0) return;

    setActiveView("chat");

    if (opts.isFromSuggestion) {
      setInput(query);
    }

    const detected = detectWorkspaceMode(trimmedQuery);
    if (detected && setActiveMode) {
      await setActiveMode(detected);
    }

    if (shouldActQuery(trimmedQuery)) {
      setInput("");
      await addMessageToHistory("user", trimmedQuery);
      try {
        await CopilotEngine.getInstance().startGoal(trimmedQuery);
      } catch (err: any) {
        const message = err?.message || "Hunter could not start autonomous mode.";
        setError(message);
        await addMessageToHistory("error", message);
      }
    } else {
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

  return (
    <div className="chat-shell flex h-full w-full text-[var(--text-primary)] font-sans overflow-hidden relative">
      {/* Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-black/45 z-30 animate-fade-in cursor-pointer"
        />
      )}

      {/* Collapsible Sidebar Chat History Drawer */}
      {sidebarOpen && (
        <div className="absolute left-0 top-0 h-full w-[200px] border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col shrink-0 animate-slide-right select-none z-40 shadow-xl">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                void createConversation();
                setSidebarOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 px-2 rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] transition duration-200 cursor-pointer"
            >
              <Plus size={14} />
              <span>New Chat</span>
            </Button>
          </div>

          {/* Conversations Lists */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
            {/* Pinned Section */}
            {conversations.some((c) => c.pinned) && (
              <div className="space-y-1">
                <span className="px-2 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Pinned</span>
                {conversations.filter((c) => c.pinned).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition duration-150 group ${conv.id === activeId
                      ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Pin size={9} className="text-[var(--accent)] rotate-45 shrink-0" />
                      <span className="truncate">{conv.title || "Chat Session"}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePinConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                        aria-label="Unpin conversation"
                        title="Unpin conversation"
                      >
                        <Pin size={12} className="rotate-45" />
                      </Button>
                      {conversations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0.5 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition cursor-pointer"
                          aria-label="Delete conversation"
                          title="Delete conversation"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recents Section */}
            <div className="space-y-1">
              <span className="px-2 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Recent Chats</span>
              {conversations.filter((c) => !c.pinned).length === 0 ? (
                <div className="px-2 py-3 text-[11px] text-[var(--text-muted)] italic">No recent chats</div>
              ) : (
                conversations.filter((c) => !c.pinned).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition duration-150 group ${conv.id === activeId
                      ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/50 hover:text-[var(--text-primary)]"
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={10} className="text-[var(--text-muted)] shrink-0" />
                      <span className="truncate">{conv.title || "Chat Session"}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          void togglePinConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                        aria-label="Pin conversation"
                        title="Pin conversation"
                      >
                        <Pin size={12} />
                      </Button>
                      {conversations.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0.5 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition cursor-pointer"
                          aria-label="Delete conversation"
                          title="Delete conversation"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-[var(--border-color)]">
            <Button
              variant="ghost"
              onClick={() => {
                setShowProfile(true);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center justify-start gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition cursor-pointer"
            >
              <Settings size={14} />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      )}

      {/* Main Panel Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-[var(--bg-primary)]">
        <ChatHeader
          currentUrl={currentUrl || undefined}
          activeGoal={copilot.machineState !== "idle" ? copilot.currentGoal : activeConversation && activeConversation.messages.length > 0 ? "Automated browser goal" : null}
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
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {activeView === "chat" && (
          <div className="mx-3 mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition ${showHistory
                ? "border-[rgba(255,107,53,0.35)] bg-[rgba(255,107,53,0.1)] text-[var(--text-primary)]"
                : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              aria-expanded={showHistory}
              aria-label="Open chat history"
            >
              <History size={13} />
              Chats
            </button>
            <button
              type="button"
              onClick={async () => {
                await createConversation();
                setShowHistory(false);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              aria-label="Start new chat"
            >
              <Plus size={13} />
              New
            </button>
          </div>
        )}

        {activeView === "chat" && showHistory && (
          <div className="mx-3 mb-2 max-h-52 overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow-[var(--shadow-product)] custom-scrollbar">
            {conversations.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">No chats yet.</div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`group flex items-center gap-2 rounded-xl px-2 py-2 transition ${conversation.id === activeId ? "bg-[var(--cards)]" : "hover:bg-[var(--bg-tertiary)]"
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      selectConversation(conversation.id);
                      setShowHistory(false);
                    }}
                    className="min-w-0 flex-1 text-left"
                    aria-current={conversation.id === activeId ? "true" : undefined}
                  >
                    <div className="truncate text-[12px] font-medium text-[var(--text-primary)]">
                      {conversation.title || "New Conversation"}
                    </div>
                    <div className="mt-0.5 truncate text-[10.5px] text-[var(--text-muted)]">
                      {conversation.messages.length} messages
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={async (event) => {
                      event.stopPropagation();
                      await deleteConversation(conversation.id);
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-70 hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                    aria-label={`Delete ${conversation.title || "chat"}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Workspace switcher */}
        <div className="mx-3 mb-1 grid grid-cols-4 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1 text-[11px] shrink-0 font-medium text-center select-none font-sans">
          <button
            onClick={() => setActiveView("chat")}
            className={`rounded-full py-1.5 transition-all cursor-pointer ${activeView === "chat" ? "bg-[var(--cards)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveView("tasks")}
            className={`rounded-full py-1.5 transition-all cursor-pointer ${activeView === "tasks" ? "bg-[var(--cards)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveView("dashboard")}
            className={`rounded-full py-1.5 transition-all cursor-pointer ${activeView === "dashboard" ? "bg-[var(--cards)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setActiveView("workflows")}
            className={`rounded-full py-1.5 transition-all cursor-pointer ${activeView === "workflows" ? "bg-[var(--cards)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
          >
            Flows
          </button>
        </div>

        {activeView === "dashboard" ? (
          <div className="flex-grow flex-1 min-h-0 overflow-y-auto">
            <WorkspaceDashboard />
          </div>
        ) : activeView === "tasks" ? (
          <div className="flex-grow flex-1 min-h-0 overflow-y-auto">
            <TaskManager />
          </div>
        ) : activeView === "workflows" ? (
          <div className="flex-grow flex-1 min-h-0 overflow-y-auto">
            <WorkflowBuilder />
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <DragDropZone onDropFile={attachFile}>
              {/* Messages Thread Log */}
              <div className="chat-thread flex-1 overflow-y-auto px-4 py-4 space-y-8 custom-scrollbar bg-transparent">
                {!activeConversation || activeConversation.messages.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in space-y-6 max-w-sm mx-auto h-full justify-self-center py-10">

                    {/* Brand Greeting */}
                    <div className="space-y-2 flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-faint)] border border-[var(--accent-dim)] text-[var(--accent)] shadow-md mb-2">
                        <Compass size={24} className="animate-spin-slow" style={{ animationDuration: "20s" }} />
                      </div>
                      <h2 className="text-xl font-bold tracking-normal text-[var(--text-primary)]">
                        Hi
                      </h2>
                      <p className="text-[13px] text-[var(--text-secondary)] font-normal leading-relaxed">
                        What would you like help with today?
                      </p>
                    </div>

                    {/* Quick actions grid */}
                    <div className="w-full space-y-2.5 text-left">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                        Suggested Prompts
                      </span>
                      <div className="grid grid-cols-1 gap-2 w-full">
                        <button
                          onClick={() => handleSendFromSuggestion("Explain this page in detail")}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition duration-150 cursor-pointer group shadow-sm"
                        >
                          <Sparkles size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                          <span className="truncate">Analyze this page</span>
                        </button>
                        <button
                          onClick={() => handleSendFromSuggestion("Compare this page with my resume")}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition duration-150 cursor-pointer group shadow-sm"
                        >
                          <Target size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                          <span className="truncate">Review my resume</span>
                        </button>
                        <button
                          onClick={() => {
                            captureScreen();
                            setTimeout(() => {
                              handleSendFromSuggestion("Explain this screenshot");
                            }, 500);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition duration-150 cursor-pointer group shadow-sm"
                        >
                          <Globe size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                          <span className="truncate">Explain this screenshot</span>
                        </button>
                        <button
                          onClick={() => handleSendFromSuggestion("Research this company")}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition duration-150 cursor-pointer group shadow-sm"
                        >
                          <Clock size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                          <span className="truncate">Research company</span>
                        </button>
                        <button
                          onClick={() => handleSendFromSuggestion("Apply to this job")}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition duration-150 cursor-pointer group shadow-sm"
                        >
                          <Zap size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                          <span className="truncate">Help me apply</span>
                        </button>
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
                      devModeOpen={devModeOpen}
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
          </div>
        )}

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

        {/* Copilot Engine Timeline Progress Card Dashboard Overlay */}
        {copilot.machineState !== "idle" && (
          <div className="mx-4 my-2.5 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-lg space-y-4 animate-scale-up select-none">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-left">Current Goal</span>
                <span className="text-[13px] font-bold text-[var(--text-primary)] mt-0.5 text-left">"{copilot.currentGoal}"</span>
              </div>
              <span className="text-[10.5px] text-[var(--text-muted)] font-mono shrink-0">
                Est: {copilot.estimatedCompletionTimeSeconds}s
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--text-secondary)]">
                <span>Progress Checklist</span>
                <span className="font-bold text-[var(--accent)]">{copilot.progress}%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 bg-[var(--accent)]"
                    style={{
                      width: `${copilot.progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Timeline Steps - Redesigned premium vertical timeline checklist */}
            <div className="relative pl-5 border-l border-[var(--border-color)] ml-3 space-y-3.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar text-[11px] font-mono leading-relaxed">
              {copilot.timeline.map((step) => {
                const isRunning = step.status === "running" || step.status === "waiting_confirmation";
                const isCompleted = step.status === "completed";
                const isFailed = step.status === "failed";

                return (
                  <div key={step.id} className="relative flex items-start justify-between gap-3 group">
                    {/* Checkbox bullet marker */}
                    <div className="absolute -left-[20px] top-[4px] flex items-center justify-center z-10 select-none">
                      {isCompleted ? (
                        <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                      ) : isFailed ? (
                        <XCircle size={11} className="text-rose-500 shrink-0" />
                      ) : isRunning ? (
                        <div className="h-2.5 w-2.5 rounded-full border border-[var(--accent)] border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] shrink-0" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold transition-all duration-200 ${isCompleted
                          ? "text-[var(--text-muted)] line-through opacity-75 text-left"
                          : isRunning
                            ? "text-[var(--text-primary)] font-bold text-left"
                            : "text-[var(--text-secondary)] text-left"
                          }`}>
                          {isCompleted || !isRunning ? step.name : step.description.replace(/^🧠\s*/, "")}
                        </span>
                        {isRunning && (
                          <span className="inline-flex items-center rounded bg-[var(--accent-faint)] px-1 py-0.25 text-[8px] font-bold text-[var(--accent)] uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      {!isCompleted && !isRunning && (
                        <p className="text-[10px] leading-relaxed mt-0.5 text-left text-[var(--text-muted)] opacity-60">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Safety Confirmation alert bar */}
            {((copilot.machineState === "waiting_confirmation") || (approvalState && approvalState.status === "pending")) && (
              <div className="p-3 rounded-xl border border-[var(--accent-dim)] bg-[var(--accent-faint)] space-y-2.5 text-left">
                <p className="text-[11px] font-bold text-[var(--accent)] flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Safety Approval Required
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {copilot.machineState === "waiting_confirmation"
                    ? copilot.pendingConfirmationMessage || "Hunter has paused before a protected action. Do you approve?"
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
                    className="flex-1 h-7 rounded bg-[var(--accent)] hover:opacity-90 text-white text-[10.5px] font-bold uppercase tracking-wider transition cursor-pointer border-0"
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
                    className="flex-1 h-7 rounded border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10.5px] font-mono uppercase transition cursor-pointer bg-transparent"
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
                  className="flex-1 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase transition cursor-pointer border-0"
                >
                  Resume Loop
                </button>
              ) : null}

              {copilot.machineState === "failed" && (
                <button
                  onClick={() => CopilotEngine.getInstance().retry()}
                  className="flex-1 h-8 rounded bg-[var(--accent)] hover:opacity-90 text-white text-[11px] font-bold uppercase transition cursor-pointer border-0"
                >
                  Retry Failed Step
                </button>
              )}

              {copilot.machineState === "completed" ? (
                <button
                  onClick={() => CopilotEngine.getInstance().cancel()}
                  className="flex-1 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase transition cursor-pointer border-0"
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
        {activeView === "chat" && (
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
        )}

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
