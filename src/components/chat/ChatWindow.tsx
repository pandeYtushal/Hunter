import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Terminal, X, AlertTriangle, Play, Pause, XOctagon } from "lucide-react";
import { useChatController } from "../../chat/ChatController";
import { ChatHeader } from "./ChatHeader";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageBubble } from "./MessageBubble";
import { AttachmentPreview } from "./AttachmentPreview";
import { PromptSuggestions } from "./PromptSuggestions";
import { ChatInput } from "./ChatInput";
import { DragDropZone } from "./DragDropZone";
import { TypingIndicator } from "./TypingIndicator";
import { CopilotEngine, type CopilotState } from "../../copilot/CopilotEngine";
import { ProfileSettings } from "../../sidebar/ProfileSettings";
import { storage } from "../../shared/storage";
import { applyDocumentTheme } from "../../shared/theme";

export const ChatWindow: React.FC = () => {
  const {
    conversations,
    activeId,
    activeConversation,
    attachments,
    input,
    isGenerating,
    error,
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
    clearCurrentConversation
  } = useChatController();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [devModeOpen, setDevModeOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [copilot, setCopilot] = useState<CopilotState>({
    machineState: "idle",
    currentGoal: "",
    tasks: [],
    progress: 0,
    timeline: [],
    isBlocked: false,
    estimatedCompletionTimeSeconds: 0
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to Copilot Engine State & Apply Theme
  useEffect(() => {
    storage.get("settings").then((settings) => {
      const theme = settings?.theme || "dark";
      applyDocumentTheme(theme);
    }).catch(() => {
      applyDocumentTheme("dark");
    });

    return CopilotEngine.getInstance().subscribe((state) => {
      setCopilot(state);
    });
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages, isGenerating, copilot.timeline]);

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
    <div className="flex h-full w-full bg-[#09090b] text-zinc-150 font-sans overflow-hidden mesh-gradient relative">
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
          currentUrl={activeConversation?.messages && activeConversation.messages[0]?.content ? undefined : undefined}
          activeGoal={copilot.machineState !== "idle" ? copilot.currentGoal : activeConversation && activeConversation.messages.length > 0 ? "Automated browser goal" : null}
          provider={devMetrics.selectedProvider}
          devMode={devModeOpen}
          onToggleDevMode={() => setDevModeOpen(!devModeOpen)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onClearChat={clearCurrentConversation}
          onToggleProfile={() => setShowProfile(true)}
        />

        {/* Drag and Drop wrapper */}
        <DragDropZone onDropFile={attachFile}>
          {/* Messages Thread Log */}
          <div className="flex-1 overflow-y-auto px-1 py-2 space-y-1.5 custom-scrollbar bg-[#09090b]/40">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 select-none animate-fade-in">
                <div className="h-12 w-12 rounded-2xl bg-[#ff6b35]/10 border border-[#ff6b35]/20 flex items-center justify-center text-[#ff6b35] mb-4 shadow-sm">
                  <Terminal size={20} className="animate-pulse" />
                </div>
                <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Multimodal Browser Copilot</h2>
                <p className="text-[11px] text-zinc-500 max-w-[240px] leading-relaxed mt-1.5 font-medium">
                  Hunter automatically observes page layout, reads metadata, tracks active goals, and answers queries.
                </p>
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
          <div className="mx-4 my-2 px-3 py-2 rounded-lg border border-rose-900/35 bg-rose-955/10 flex items-center gap-2 text-xs font-medium text-rose-455 select-none animate-scale-up">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="flex-1 truncate">{error}</span>
            <button
              onClick={() => {}}
              className="p-1 rounded hover:bg-rose-900/20 text-rose-500 hover:text-white transition cursor-pointer"
            >
              <X size={10} />
            </button>
          </div>
        )}

        {/* Suggestion Chips */}
        {(!activeConversation || activeConversation.messages.length === 0) && copilot.machineState === "idle" && (
          <PromptSuggestions onSelect={handleSendFromSuggestion} />
        )}

        {/* Copilot Engine Timeline Progress Card Dashboard Overlay */}
        {copilot.machineState !== "idle" && (
          <div className="mx-4 my-2.5 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-lg space-y-4 animate-scale-up select-none">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ff6b35] animate-ping" />
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Autonomous Copilot Mode: {copilot.machineState}
                </h3>
              </div>
              <span className="text-[9.5px] text-zinc-550 font-mono">
                Est. completion: {copilot.estimatedCompletionTimeSeconds}s
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11.5px] font-bold text-zinc-200 block">"{copilot.currentGoal}"</span>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-zinc-850 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff6b35] to-[#ff8255] transition-all duration-300"
                    style={{ width: `${copilot.progress}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold font-mono text-[#ff6b35]">{copilot.progress}%</span>
              </div>
            </div>

            {/* Timeline Steps */}
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar text-[10.5px] font-mono leading-relaxed">
              {copilot.timeline.map((step) => (
                <div key={step.id} className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold ${
                      step.status === "completed"
                        ? "text-emerald-450"
                        : step.status === "failed"
                        ? "text-rose-500 font-bold"
                        : step.status === "running" || step.status === "waiting_confirmation"
                        ? "text-[#ff6b35] animate-pulse"
                        : "text-zinc-650"
                    }`}>
                      {step.status === "completed" ? "✓" : step.status === "failed" ? "✗" : "○"}
                    </span>
                    <span className={
                      step.status === "completed" ? "text-zinc-600 line-through font-medium" : "text-zinc-350"
                    }>
                      {step.name}
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-550 italic truncate max-w-[150px]">{step.description}</span>
                </div>
              ))}
            </div>

            {/* Safety Confirmation alert bar */}
            {copilot.machineState === "waiting_confirmation" && (
              <div className="p-3 rounded-xl border border-[#ff6b35]/25 bg-[#ff6b35]/5 space-y-2.5">
                <p className="text-[10.5px] font-bold text-[#ff6b35] flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Safety Approval Required
                </p>
                <p className="text-[9.5px] text-zinc-450 leading-relaxed">
                  Hunter has paused before performing a critical operation (Submit, Purchase, Delete, Upload). Do you confirm?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => CopilotEngine.getInstance().approve()}
                    className="flex-1 h-7 rounded bg-[#ff6b35] hover:bg-[#ff8255] text-black text-[10.5px] font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Confirm Action
                  </button>
                  <button
                    onClick={() => CopilotEngine.getInstance().skip()}
                    className="flex-1 h-7 rounded border border-[var(--border-color)] text-zinc-400 hover:text-white text-[10.5px] font-mono uppercase transition cursor-pointer"
                  >
                    Skip Step
                  </button>
                </div>
              </div>
            )}

            {/* User Control Buttons */}
            <div className="flex gap-2 border-t border-[var(--border-color)] pt-3.5">
              {copilot.machineState === "executing" ? (
                <button
                  onClick={() => CopilotEngine.getInstance().pause()}
                  className="flex-1 h-8 rounded border border-zinc-800 bg-[#1a1a1a] hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 transition cursor-pointer"
                >
                  Pause Loop
                </button>
              ) : copilot.machineState === "paused" ? (
                <button
                  onClick={() => CopilotEngine.getInstance().resume()}
                  className="flex-1 h-8 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase transition cursor-pointer"
                >
                  Resume Loop
                </button>
              ) : null}

              {copilot.machineState === "failed" && (
                <button
                  onClick={() => CopilotEngine.getInstance().retry()}
                  className="flex-1 h-8 rounded bg-[#ff6b35] hover:bg-[#ff8255] text-black text-[10px] font-bold uppercase transition cursor-pointer"
                >
                  Retry Failed Step
                </button>
              )}

              <button
                onClick={() => CopilotEngine.getInstance().cancel()}
                className="h-8 px-3 rounded border border-rose-900 bg-transparent hover:bg-rose-950/20 text-rose-400 text-[10px] font-semibold transition cursor-pointer"
              >
                Cancel Goal
              </button>
            </div>
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
            attachFile(new File([new Blob()], att.name, { type: att.mimeType }));
          }}
        />

        {/* Developer Mode Drawer panel */}
        {devModeOpen && (
          <div className="border-t border-[rgba(255,255,255,0.08)] bg-[#09090b] p-4 text-[10.5px] font-mono leading-relaxed select-text max-h-[200px] overflow-y-auto custom-scrollbar animate-fade-in shadow-inner">
            <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-2 mb-3">
              <h3 className="font-bold text-[#ff6b35] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={12} />
                Developer Console Metrics
              </h3>
              <button
                onClick={() => setDevModeOpen(false)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3 text-zinc-400">
              <div>
                <span className="text-zinc-650 font-bold">ACTIVE CHAT PROVIDER:</span>{" "}
                <span className="text-zinc-200">{devMetrics.selectedProvider.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-zinc-650 font-bold">VISION PROVIDER:</span>{" "}
                <span className="text-zinc-200">{devMetrics.visionProvider.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-zinc-650 font-bold">STREAM STATUS:</span>{" "}
                <span className={`font-bold uppercase ${
                  devMetrics.streamingStatus === "streaming"
                    ? "text-[#ff6b35]"
                    : devMetrics.streamingStatus === "completed"
                    ? "text-emerald-400"
                    : "text-zinc-500"
                }`}>
                  {devMetrics.streamingStatus}
                </span>
              </div>
              <div>
                <span className="text-zinc-650 font-bold">CONTEXT SIZE (EST):</span>{" "}
                <span className="text-zinc-200">{devMetrics.contextSize} Tokens</span>
              </div>
              <div>
                <span className="text-zinc-650 font-bold">TOKENS COMPLETED:</span>{" "}
                <span className="text-zinc-200">{devMetrics.tokenUsage.completionTokens || "—"}</span>
              </div>
              <div>
                <span className="text-zinc-650 font-bold">TOTAL TOKENS:</span>{" "}
                <span className="text-zinc-200">{devMetrics.tokenUsage.totalTokens || "—"}</span>
              </div>
            </div>

            {devMetrics.prompt && (
              <div className="mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.06)]">
                <span className="text-zinc-650 font-bold block mb-1">RAW COMPILED PROMPT SENT:</span>
                <pre className="rounded bg-[#121214] p-3 text-[10px] text-zinc-300 overflow-x-auto select-all max-h-24 custom-scrollbar whitespace-pre-wrap">
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
