import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, Trash2, X, MapPin, DollarSign, Award, Check, Plus, User, Sparkles, AlertCircle, Copy, Download, Activity, ChevronDown, ChevronUp, FileSearch, ClipboardList, Zap, PenTool, Briefcase, Brain, Database, History, RefreshCw, AlertTriangle, CheckCircle2, Play, ChevronRight, ChevronLeft, Target, Building2, Search, FileText, Sidebar, Sun, Moon } from "lucide-react";
import { Button } from "../shared/components/Button";
import { storage } from "../shared/storage";
import { applyDocumentTheme } from "../shared/theme";
import type { ChatMessage, PageSnapshot } from "../shared/types/messages";
import type { AgentState, AgentType } from "../shared/types/agent";
import type { AgentSettings } from "../shared/types/storage";
import type { AgentMetricRecord } from "../debug/AgentMetrics";
import type { ExecutionLogEntry } from "../debug/ExecutionLogger";
import type { HealthCheckResult } from "../ai/healthCheck";
import type { LongTermMemory } from "../types/Memory";
import { VoiceInput } from "./VoiceInput";
import { ProfileSettings } from "./ProfileSettings";
import { Markdown, parseInlineMarkdown } from "../shared/components/Markdown";
import { DeveloperPanel } from "./DeveloperPanel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatTimelineMessage = (message: string, action?: string, level?: string) => {
  const isFail = level === "error" || message.toLowerCase().includes("fail") || message.toLowerCase().includes("error");
  const actionLabel = action ? action.replace(/_/g, " ") : "task";

  if (isFail) {
    let desc = "Hunter is adapting execution plan.";
    let title = "Action Failed";

    if (action === "extract_text" || action === "extract_job" || message.includes("extract")) {
      title = "⚠ Couldn't extract job details";
      desc = "Hunter is trying another approach.";
    } else if (action === "fill_input" || message.includes("fill")) {
      title = "⚠ Couldn't populate form fields";
      desc = "Hunter is retrying with secondary elements.";
    } else if (action === "upload_resume" || message.includes("resume")) {
      title = "⚠ Couldn't upload resume";
      desc = "Hunter is attempting to locate alternative upload handlers.";
    } else {
      title = `⚠ Couldn't complete ${actionLabel}`;
      desc = "Hunter is adapting its strategy.";
    }

    return { status: "failure" as const, title, desc, badge: "Retrying" };
  }

  let title = "Task Completed";
  let desc = "Action processed successfully.";
  if (action === "extract_text" || action === "extract_job") {
    title = "Job Details Extracted";
    desc = "Hunter successfully read and parsed job specifications.";
  } else if (action === "fill_input") {
    title = "Form Populate Succeeded";
    desc = "Hunter filled form fields successfully.";
  } else if (action === "upload_resume") {
    title = "Resume Upload Complete";
    desc = "Hunter successfully selected and uploaded resume.";
  } else {
    title = `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} Succeeded`;
  }

  return { status: "success" as const, title, desc, badge: "Success" };
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: string;
  skills: string[];
}

interface MatchAnalysis {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string;
}

interface CoverLetter {
  id: string;
  company: string;
  role: string;
  content: string;
  createdAt: string;
}

interface AutofillProposal {
  tempId: string;
  labelText: string;
  mappedType: string;
  fillValue: string;
  tagName: string;
}

interface AutofillConfirmation {
  type: "autofill_confirmation";
  proposals: AutofillProposal[];
  highlighted: string[];
  skipped: string[];
}

interface OrchestrationResult {
  type: "orchestration_result";
  summary: string;
  job?: ExtractedJob;
  match?: MatchAnalysis;
  coverLetter?: CoverLetter;
  autofill?: AutofillConfirmation;
  errors?: string[];
}

// ---------------------------------------------------------------------------
// FIX 3 & 7: Discriminated union — parse once, no repeated JSON.parse calls
// ---------------------------------------------------------------------------

type ParsedAssistantContent =
  | { kind: "job"; data: ExtractedJob }
  | { kind: "match"; data: MatchAnalysis }
  | { kind: "cover"; data: CoverLetter }
  | { kind: "autofill"; data: AutofillConfirmation }
  | { kind: "orchestration"; data: OrchestrationResult }
  | { kind: "error"; message: string }
  | { kind: "text" };

const parseAssistantContent = (content: string): ParsedAssistantContent => {
  try {
    const obj = JSON.parse(content);
    if (!obj || typeof obj !== "object") return { kind: "text" };
    if ("error" in obj) return { kind: "error", message: obj.error };
    if (obj.type === "autofill_confirmation") return { kind: "autofill", data: obj as AutofillConfirmation };
    if (obj.type === "orchestration_result") return { kind: "orchestration", data: obj as OrchestrationResult };
    if ("matchScore" in obj && "matchedSkills" in obj) return { kind: "match", data: obj as MatchAnalysis };
    if ("title" in obj && "company" in obj) return { kind: "job", data: obj as ExtractedJob };
    if ("content" in obj && "company" in obj) return { kind: "cover", data: obj as CoverLetter };
  } catch {
    // not JSON
  }
  return { kind: "text" };
};

const isFullWidthKind = (kind: ParsedAssistantContent["kind"]) =>
  kind === "job" || kind === "match" || kind === "cover" || kind === "autofill" || kind === "orchestration";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MatchAnalysisCard = ({
  analysis,
  onSubmitPrompt,
}: {
  analysis: MatchAnalysis;
  onSubmitPrompt?: (prompt: string) => void;
}) => {
  const score = analysis.matchScore;

  return (
    <div className="my-2 p-3.5 rounded-[14px] border border-zinc-800/80 bg-[#141414] shadow-sm text-[12px] font-sans">
      <div className="flex items-center gap-3.5 border-b border-[rgba(255,255,255,0.04)] pb-3">
        <div className="text-2xl font-bold text-emerald-400">{score}%</div>
        <div>
          <div className="font-semibold text-zinc-100">Resume Match</div>
          <div className="text-zinc-400 text-[11px] leading-tight mt-0.5">Hunter analyzed your fit for this role.</div>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <div className="text-zinc-500 font-semibold text-[11px] mb-1">Matched Skills</div>
          <div className="text-zinc-200 leading-relaxed text-[11.5px] font-medium">{analysis.matchedSkills.slice(0, 5).join(", ")}{analysis.matchedSkills.length > 5 ? "..." : ""}</div>
        </div>
        <div>
          <div className="text-zinc-500 font-semibold text-[11px] mb-1">Missing Skills</div>
          <div className="text-zinc-200 leading-relaxed text-[11.5px] font-medium">{analysis.missingSkills.slice(0, 5).join(", ") || "None!"}</div>
        </div>
      </div>

      {onSubmitPrompt && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)]">
          <button
            onClick={() => onSubmitPrompt("Improve my resume")}
            className="flex-1 h-8 rounded-lg border border-zinc-800 bg-[#1a1a1a] text-[11px] font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            Improve Resume
          </button>
          <button
            onClick={() => onSubmitPrompt("Generate cover letter")}
            className="flex-1 h-8 rounded-lg border border-zinc-800 bg-[#1a1a1a] text-[11px] font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            Cover Letter
          </button>
        </div>
      )}
    </div>
  );
};

const CoverLetterCard = ({ coverLetter }: { coverLetter: CoverLetter }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coverLetter.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy cover letter text:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([coverLetter.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cover_Letter_${coverLetter.company.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-2 rounded-[14px] border border-zinc-800/80 bg-[#141414] overflow-hidden text-[12px] shadow-sm font-sans">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h4 className="text-[13px] font-bold text-zinc-100 truncate" title={`Cover Letter - ${coverLetter.company}.txt`}>
              Cover Letter - {coverLetter.company}.txt
            </h4>
            <p className="text-[11px] text-zinc-400 font-medium">Tailored Letter</p>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            title="Copy text"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-[#1a1a1a] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
          <button
            onClick={handleDownload}
            title="Download cover letter (.txt)"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-[#1a1a1a] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 bg-[#1a1a1a] border-t border-[rgba(255,255,255,0.04)] transition cursor-pointer"
      >
        <span>{isExpanded ? "Hide Preview" : "View Letter Preview"}</span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-[rgba(255,255,255,0.04)] bg-[#111111]">
          <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-800/80 bg-[#141414] p-3 text-[11.5px] leading-relaxed text-zinc-300 whitespace-pre-wrap select-text custom-scrollbar">
            {coverLetter.content}
          </div>
        </div>
      )}
    </div>
  );
};

const JobDetailsCard = ({
  job,
  pageUrl,
  onAnalyzeFit,
}: {
  job: ExtractedJob;
  pageUrl?: string;
  onAnalyzeFit?: () => void;
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    storage.get("applications").then((apps) => {
      const exists = apps?.some(
        (app) =>
          app.company.toLowerCase() === job.company.toLowerCase() &&
          app.role.toLowerCase() === job.title.toLowerCase()
      );
      if (exists) setIsSaved(true);
    });
  }, [job]);

  const handleTrackJob = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    try {
      const current = (await storage.get("applications")) || [];
      const newApp = {
        id: crypto.randomUUID(),
        company: job.company,
        role: job.title,
        sourceUrl: pageUrl || "",
        status: "saved" as const,
        createdAt: new Date().toISOString(),
      };
      await storage.set("applications", [...current, newApp]);
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to track job:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="my-2 p-3.5 rounded-[14px] border border-zinc-800/80 bg-[#141414] shadow-sm text-[12px] font-sans">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-bold text-zinc-100 truncate">{job.title}</h3>
          <p className="text-[12px] text-zinc-400 truncate mt-0.5">{job.company}</p>
        </div>

        <div className="flex gap-1.5 shrink-0">
          {onAnalyzeFit && (
            <button
              onClick={onAnalyzeFit}
              className="h-7 px-2.5 rounded-lg border border-zinc-800 bg-[#1a1a1a] text-[11px] font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
            >
              Match Fit
            </button>
          )}
          <button
            onClick={handleTrackJob}
            disabled={isSaved || isSaving}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition cursor-pointer ${isSaved
              ? "bg-emerald-500/10 text-emerald-400"
              : "border border-zinc-800 bg-[#1a1a1a] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
          >
            {isSaved ? "Saved" : isSaving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-[11.5px] text-zinc-300">
        <div><span className="text-zinc-500 inline-block w-[75px]">Location:</span> {job.location}</div>
        <div><span className="text-zinc-500 inline-block w-[75px]">Salary:</span> {job.salary}</div>
        <div><span className="text-zinc-500 inline-block w-[75px]">Experience:</span> {job.experience}</div>
      </div>

      {job.skills && job.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 8).map((skill, index) => (
            <span key={index} className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10.5px] text-zinc-300 font-medium">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const AutofillConfirmationCard = ({ confirmation }: { confirmation: AutofillConfirmation }) => {
  const [status, setStatus] = useState<"pending" | "submitting" | "confirmed" | "cancelled">("pending");
  const [filledCount, setFilledCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    setStatus("submitting");
    setErrorMsg("");
    try {
      if (typeof chrome === "undefined" || !chrome.runtime) {
        throw new Error("Autofill is only available within the Chrome Extension environment.");
      }
      const response = (await chrome.runtime.sendMessage({
        type: "SEND_TO_ACTIVE_TAB",
        message: { type: "EXECUTE_AUTOFILL", proposals: confirmation.proposals },
      })) as { ok: boolean; filledCount?: number; error?: string } | undefined;

      if (response && response.ok) {
        setFilledCount(response.filledCount || 0);
        setStatus("confirmed");
      } else {
        throw new Error(response?.error || "Content script failed to execute autofill.");
      }
    } catch (err) {
      setStatus("pending");
      setErrorMsg(err instanceof Error ? err.message : "Error executing autofill.");
    }
  };

  // FIX (minor): skip "submitting" state on cancel — no spinner flash
  const handleCancel = async () => {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        await chrome.runtime.sendMessage({
          type: "SEND_TO_ACTIVE_TAB",
          message: { type: "CANCEL_AUTOFILL" },
        });
      }
    } catch (err) {
      console.warn("Cancel autofill signal failed", err);
    }
    setStatus("cancelled");
  };

  if (status === "confirmed") {
    return (
      <div className="my-2 rounded-lg border border-emerald-900/35 bg-emerald-950/10 p-4 text-xs font-mono">
        <h3 className="text-xs font-bold text-emerald-450 flex items-center gap-1.5 uppercase tracking-wide">
          <Check size={14} className="shrink-0 text-emerald-400" />
          Form Autofill Complete
        </h3>
        <p className="mt-1.5 text-[11px] text-zinc-355 leading-relaxed">
          Successfully populated **{filledCount}** fields on the webpage form.
        </p>
        {confirmation.highlighted.length > 0 && (
          <div className="mt-3 border-t border-emerald-900/20 pt-2.5 text-[10px] text-zinc-400">
            <span className="font-bold text-zinc-300">Manual review required:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px]">
              {confirmation.highlighted.map((h, i) => (
                <li key={i} className="truncate">{h} (Highlighted in blue)</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="my-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-zinc-550 italic text-xs font-mono">
        Autofill flow cancelled.
      </div>
    );
  }

  const proposalsToFill = confirmation.proposals.filter((p) => p.mappedType !== "resume");
  const resumeFields = confirmation.proposals.filter((p) => p.mappedType === "resume");

  return (
    <div className="my-2.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111111] p-4 shadow-sm text-xs font-mono">
      <div className="border-b border-[rgba(255,255,255,0.08)] pb-3">
        <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles size={14} className="text-[#ff6b35] shrink-0" />
          Form Autofill Confirmation
        </h3>
        <p className="text-[9px] text-zinc-500 mt-0.5">Review fields before populating the form</p>
      </div>

      {errorMsg && (
        <div className="mt-2 text-xs text-rose-455 bg-rose-955/10 p-2 rounded border border-rose-900/40">{errorMsg}</div>
      )}

      <div className="mt-3.5 space-y-3.5 text-[11px]">
        {proposalsToFill.length > 0 ? (
          <div>
            <h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              Proposed Fields ({proposalsToFill.length})
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {proposalsToFill.map((prop) => (
                <div key={prop.tempId} className="flex flex-col gap-0.5 rounded border border-[rgba(255,255,255,0.08)] bg-[#090909] p-2">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                    {prop.labelText} <span className="text-[8px] font-normal text-zinc-500">({prop.tagName})</span>
                  </span>
                  <span className="font-semibold text-zinc-250 truncate text-[10px]">{prop.fillValue}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-500 italic">No fillable text fields found on form.</div>
        )}

        {resumeFields.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-[#ff6b35] flex items-center gap-1">
              <AlertCircle size={10} />
              Manual Upload Required
            </h4>
            <div className="rounded border border-[#ff6b35]/20 bg-[#ff6b35]/5 p-2 text-[10px] text-[#ff6b35]">
              Form scripts cannot set file upload inputs. Resume uploads will be highlighted in blue for manual upload.
            </div>
          </div>
        )}

        {confirmation.skipped.length > 0 && (
          <div>
            <h4 className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              Skipped Fields ({confirmation.skipped.length})
            </h4>
            <div className="text-[9px] text-zinc-500 max-h-20 overflow-y-auto space-y-0.5 italic custom-scrollbar">
              {confirmation.skipped.map((s, idx) => (
                <div key={idx} className="truncate">• {s}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-[rgba(255,255,255,0.08)] pt-3.5">
        <button
          onClick={handleConfirm}
          disabled={status === "submitting" || (proposalsToFill.length === 0 && resumeFields.length === 0)}
          className="flex-1 flex h-8 items-center justify-center gap-1 rounded bg-[#ff6b35] text-[#09090b] hover:bg-[#ff8255] disabled:opacity-50 font-bold text-xs uppercase transition shadow-sm cursor-pointer"
        >
          {status === "submitting" ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
          Confirm Fill
        </button>
        <button
          onClick={handleCancel}
          disabled={status === "submitting"}
          className="flex-1 flex h-8 items-center justify-center gap-1 rounded border border-[rgba(255,255,255,0.08)] bg-[#090909] text-zinc-300 hover:text-white transition font-mono uppercase text-xs cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const OrchestrationResultCard = ({
  result,
  currentUrl,
  onSubmitPrompt,
}: {
  result: OrchestrationResult;
  currentUrl: string;
  onSubmitPrompt?: (prompt: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState<"job" | "match" | "cover" | "fill">("job");

  useEffect(() => {
    if (result.job) setActiveTab("job");
    else if (result.match) setActiveTab("match");
    else if (result.coverLetter) setActiveTab("cover");
    else if (result.autofill) setActiveTab("fill");
  }, [result]);

  return (
    <div className="my-2.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111111] shadow-sm overflow-hidden text-xs">
      <div className="bg-[#090909]/40 px-3 py-2.5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 font-mono uppercase">
            <Bot size={13} className="text-[#ff6b35] shrink-0" />
            Job Application Flow
          </h3>
          <p className="text-[9px] text-zinc-500 truncate max-w-[280px] font-mono">{result.summary}</p>
        </div>
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className="bg-rose-955/20 text-rose-400 p-2 text-[10px] border-b border-rose-900/30 font-mono">
          <strong>Some steps failed:</strong>
          <ul className="list-disc list-inside">
            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="flex border-b border-[rgba(255,255,255,0.08)] text-[10px] bg-[#090909]/20 font-semibold font-mono">
        {result.job && (
          <button onClick={() => setActiveTab("job")} className={`flex-1 py-2 text-center border-b-2 transition cursor-pointer ${activeTab === "job" ? "border-[#ff6b35] text-[#ff6b35]" : "border-transparent text-zinc-500 hover:text-zinc-350"}`}>
            Job Info
          </button>
        )}
        {result.match && (
          <button onClick={() => setActiveTab("match")} className={`flex-1 py-2 text-center border-b-2 transition cursor-pointer ${activeTab === "match" ? "border-[#ff6b35] text-[#ff6b35]" : "border-transparent text-zinc-500 hover:text-zinc-350"}`}>
            Match Score
          </button>
        )}
        {result.coverLetter && (
          <button onClick={() => setActiveTab("cover")} className={`flex-1 py-2 text-center border-b-2 transition cursor-pointer ${activeTab === "cover" ? "border-[#ff6b35] text-[#ff6b35]" : "border-transparent text-zinc-500 hover:text-zinc-350"}`}>
            Cover Letter
          </button>
        )}
        {result.autofill && (
          <button onClick={() => setActiveTab("fill")} className={`flex-1 py-2 text-center border-b-2 transition cursor-pointer ${activeTab === "fill" ? "border-[#ff6b35] text-[#ff6b35]" : "border-transparent text-zinc-500 hover:text-zinc-350"}`}>
            Autofill Form
          </button>
        )}
      </div>

      <div className="p-3 bg-[#090909]/20">
        {activeTab === "job" && result.job && <JobDetailsCard job={result.job} pageUrl={currentUrl} />}
        {activeTab === "match" && result.match && <MatchAnalysisCard analysis={result.match} onSubmitPrompt={onSubmitPrompt} />}
        {activeTab === "cover" && result.coverLetter && <CoverLetterCard coverLetter={result.coverLetter} />}
        {activeTab === "fill" && result.autofill && <AutofillConfirmationCard confirmation={result.autofill} />}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Static data (single source of truth)
// ---------------------------------------------------------------------------



const tryAskingPrompts = [
  {
    label: "Analyze this job posting",
    desc: "Extract role details, salary, and skills",
    prompt: "Analyze this job posting",
    icon: Search,
    badgeBg: "bg-[#ffece5] text-[#ff6b35] border border-[#ff6b35]/20",
  },
  {
    label: "Research this company",
    desc: "Funding, culture, and recent news",
    prompt: "Research this company",
    icon: Building2,
    badgeBg: "bg-[#e5f5f0] text-[#10b981] border border-[#10b981]/20",
  },
  {
    label: "Match my resume to requirements",
    desc: "Skills gap analysis and fit score",
    prompt: "Match my resume to requirements",
    icon: Target,
    badgeBg: "bg-[#e8eaff] text-[#6366f1] border border-[#6366f1]/20",
  },
  {
    label: "Generate a cover letter",
    desc: "Tailored to this job and your profile",
    prompt: "Generate a cover letter",
    icon: FileText,
    badgeBg: "bg-[#f3e8ff] text-[#a855f7] border border-[#a855f7]/20",
  },
  {
    label: "Summarize this page",
    desc: "Get a quick overview of the content",
    prompt: "Summarize this page",
    icon: FileSearch,
    badgeBg: "bg-[#fffbeb] text-[#f59e0b] border border-[#f59e0b]/20",
  },
];

const pillGoals = [
  { label: "Analyze job", prompt: "Analyze this job posting", icon: Search },
  { label: "Research company", prompt: "Research this company", icon: Building2 },
  { label: "Match resume", prompt: "Match my resume to requirements", icon: Target },
  { label: "Autofill form", prompt: "Autofill application form", icon: Zap },
  { label: "Summarize page", prompt: "Summarize this page", icon: FileSearch },
];

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type SendChatResponse =
  | { message: ChatMessage; history: ChatMessage[]; ok?: true }
  | { ok: false; error: string };

type ChatHistoryResponse = { history: ChatMessage[]; ok?: true } | { ok: false; error: string };

const createLocalMessage = (content: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  content,
  createdAt: new Date().toISOString(),
});

const requestPageSnapshot = async (): Promise<PageSnapshot | undefined> => {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: "SEND_TO_ACTIVE_TAB",
      message: { type: "GET_PAGE_SNAPSHOT" },
    })) as { snapshot?: PageSnapshot } | undefined;
    return response?.snapshot;
  } catch (err) {
    console.error("Failed to request page snapshot:", err);
    return undefined;
  }
};

// FIX 4: moved outside component — was recreated on every render
const formatConfidence = (val: number | undefined): string => {
  // FIX 4: no more magic "92%" — return "—" when value is absent
  if (val === undefined || val === null) return "—";
  return val <= 1 ? `${Math.round(val * 100)}%` : `${Math.round(val)}%`;
};

// ---------------------------------------------------------------------------
// FIX 6: UI visibility flags consolidated into one object
// ---------------------------------------------------------------------------

interface UiFlags {
  showProfile: boolean;
  showSteps: boolean;
  showMemory: boolean;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ChatWindow = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  // FIX 6: all boolean UI flags in one object
  const [ui, setUi] = useState<UiFlags>({ showProfile: false, showSteps: true, showMemory: false });
  const setUiFlag = (key: keyof UiFlags, value: boolean) => setUi((s) => ({ ...s, [key]: value }));

  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetricRecord[]>([]);
  const [longMemory, setLongMemory] = useState<LongTermMemory | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 1);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  const scrollChips = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -150 : 150;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 200);
    window.addEventListener("resize", checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScroll);
    };
  }, [messages, agentState?.isActive, checkScroll]);

  // FIX 2 & 1: useMemo — only recalculates when messages change
  const latestMatchScore = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const parsed = parseAssistantContent(msg.content);
        if (parsed.kind === "match") return `${parsed.data.matchScore}%`;
        if (parsed.kind === "orchestration" && parsed.data.match?.matchScore !== undefined) {
          return `${parsed.data.match.matchScore}%`;
        }
      }
    }
    return "—";
  }, [messages]);

  // FIX 2: stable ref so submitPrompt has a stable identity without isSending in deps
  const isSendingRef = useRef(false);

  const handleStopAgent = async () => {
    if (agentState) {
      const stoppedState: AgentState = {
        ...agentState,
        isActive: false,
        currentStep: "Execution cancelled by user.",
        progress: 100,
      };
      await chrome.storage.local.set({ agentState: stoppedState });
      setAgentState(stoppedState);
    }
  };

  const toggleTheme = async () => {
    const currentTheme = settings?.theme || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    const newSettings: AgentSettings = {
      theme: nextTheme,
      sidebarPinned: settings?.sidebarPinned ?? false,
      userName: settings?.userName ?? "",
      developerMode: settings?.developerMode ?? false,
      apiKey: settings?.apiKey,
      openaiApiKey: settings?.openaiApiKey,
      anthropicApiKey: settings?.anthropicApiKey,
      groqApiKey: settings?.groqApiKey,
      provider: settings?.provider,
    };
    await storage.set("settings", newSettings);
    setSettings(newSettings);
    applyDocumentTheme(nextTheme);
  };

  useEffect(() => {
    const isExt = typeof chrome !== "undefined" && typeof chrome.runtime !== "undefined";

    if (isExt) {
      chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB" })
        .then((response) => { if (response?.tab?.url) setCurrentUrl(response.tab.url); })
        .catch(() => undefined);
    }

    storage.get("settings").then((s) => {
      if (s) {
        setSettings(s);
        applyDocumentTheme(s.theme);
      }
    });
    storage.get("executionLogs").then((logs) => setExecutionLogs(logs || []));
    storage.get("applications").then((apps) => setApplications(apps || []));
    storage.get("coverLetters").then((cls) => setCoverLetters(cls || []));
    storage.get("agentMetrics").then((metrics) => setAgentMetrics(metrics ? Object.values(metrics) : []));
    storage.get("longTermMemory").then((mem) => setLongMemory(mem || null));
    storage.get("healthChecks").then((checks) => setHealthChecks(checks || []));

    if (isExt && chrome.storage?.local) {
      chrome.storage.local.get("agentState").then((data) => {
        if (data.agentState) setAgentState(data.agentState as AgentState);
      });
    }

    if (isExt) {
      chrome.runtime
        .sendMessage({ type: "GET_CHAT_HISTORY" })
        .then((response: ChatHistoryResponse) => {
          if (!response) { setError("Could not load chat history."); return; }
          if ("error" in response) { setError(response.error); return; }
          setMessages(response.history || []);
        })
        .catch(() => setError("Could not load chat history."))
        .finally(() => setIsLoadingHistory(false));
    } else {
      setIsLoadingHistory(false);
    }

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "sync" && changes.settings?.newValue) {
        setSettings(changes.settings.newValue);
        applyDocumentTheme(changes.settings.newValue.theme);
      }
      if (areaName === "sync" && changes.chatHistory) setMessages((changes.chatHistory.newValue as ChatMessage[]) || []);
      if (areaName === "sync" && changes.executionLogs) setExecutionLogs((changes.executionLogs.newValue as ExecutionLogEntry[]) || []);
      if (areaName === "sync" && changes.applications) setApplications((changes.applications.newValue as any[]) || []);
      if (areaName === "sync" && changes.coverLetters) setCoverLetters((changes.coverLetters.newValue as any[]) || []);
      if (areaName === "sync" && changes.agentMetrics) setAgentMetrics(changes.agentMetrics.newValue ? Object.values(changes.agentMetrics.newValue as Record<string, AgentMetricRecord>) : []);
      if (areaName === "sync" && changes.longTermMemory) setLongMemory((changes.longTermMemory.newValue as LongTermMemory) || null);
      if (areaName === "sync" && changes.healthChecks) setHealthChecks((changes.healthChecks.newValue as HealthCheckResult[]) || []);
      if (areaName === "local" && changes.agentState) setAgentState((changes.agentState.newValue as AgentState) || null);
    };

    if (isExt && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d" && settings) {
        const nextSettings = { ...settings, developerMode: !settings.developerMode };
        void storage.set("settings", nextSettings);
        setSettings(nextSettings);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settings]);

  const closeSidebar = () => {
    window.parent.postMessage({ source: "ai-job-agent-sidebar", type: "CLOSE_SIDEBAR" }, "*");
  };

  const clearHistory = async () => {
    setError("");
    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        const response = (await chrome.runtime.sendMessage({ type: "CLEAR_CHAT_HISTORY" })) as ChatHistoryResponse;
        if (!response) { setError("Could not clear chat history."); return; }
        if ("error" in response) { setError(response.error); return; }
        setMessages(response.history || []);
      } else {
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear chat history.");
    }
  };

  // FIX 2 & 3: stable callback — no isSending in deps, uses ref instead
  const submitPrompt = useCallback(async (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt || isSendingRef.current) return;

    const localUserMessage = createLocalMessage(prompt);

    // FIX 3: snapshot for rollback before optimistic update
    setMessages((current) => {
      return [...current, localUserMessage];
    });
    setInput("");
    setError("");
    setIsSending(true);
    isSendingRef.current = true;

    // Keep a reference to roll back to if the request fails
    let rollbackMessages: ChatMessage[] = [];
    setMessages((current) => {
      rollbackMessages = current.slice(0, -1); // everything before the optimistic message
      return current;
    });

    try {
      const pageContext = await requestPageSnapshot();
      const settings = await storage.get("settings").catch(() => null);

      if (settings?.streaming) {
        const assistantMsgId = crypto.randomUUID();
        const assistantMessage: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString()
        };

        setMessages((current) => [...current, assistantMessage]);

        const profile = await storage.get("profile").catch(() => undefined);
        const port = chrome.runtime.connect({ name: "stream-chat" });

        port.postMessage({
          prompt,
          pageContext,
          history: rollbackMessages.map(m => ({ role: m.role, content: m.content })),
          profile
        });

        let accumulatedText = "";

        port.onMessage.addListener(async (msg) => {
          if (msg.type === "chunk") {
            accumulatedText += msg.text;
            setMessages((current) =>
              current.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: accumulatedText }
                  : m
              )
            );
          } else if (msg.type === "done") {
            port.disconnect();
            const finalAssistantMsg = {
              id: assistantMsgId,
              role: "assistant" as const,
              content: accumulatedText,
              createdAt: new Date().toISOString()
            };
            const nextHistory = [...rollbackMessages, localUserMessage, finalAssistantMsg].slice(-40);
            await storage.set("chatHistory", nextHistory);
            setMessages(nextHistory);
            setIsSending(false);
            isSendingRef.current = false;
          } else if (msg.type === "error") {
            port.disconnect();
            setMessages(rollbackMessages);
            setError(msg.error || "Streaming failed.");
            setIsSending(false);
            isSendingRef.current = false;
          }
        });

        port.onDisconnect.addListener(() => {
          setIsSending(false);
          isSendingRef.current = false;
        });

        return;
      }

      const response = (await chrome.runtime.sendMessage({
        type: "SEND_CHAT_MESSAGE",
        prompt,
        pageContext,
      })) as SendChatResponse;

      if (!response) {
        // FIX 3: revert optimistic update on failure
        setMessages(rollbackMessages);
        setError("API did not return a response.");
        return;
      }

      if ("error" in response) {
        // FIX 3: revert optimistic update on failure
        setMessages(rollbackMessages);
        setError(response.error);
        return;
      }

      setMessages(response.history);
    } catch {
      // FIX 3: revert optimistic update on network error
      setMessages(rollbackMessages);
      setError("API could not respond. Check your API key, connection, and extension permissions.");
    } finally {
      const settings = await storage.get("settings").catch(() => null);
      if (!settings?.streaming) {
        setIsSending(false);
        isSendingRef.current = false;
      }
    }
  }, []); // FIX 2: stable — no deps that cause needless rebuilds

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPrompt(input);
  };

  const updateVoiceTranscript = useCallback((transcript: string) => {
    setInput(transcript);
  }, []);

  const submitVoiceTranscript = useCallback(
    (transcript: string) => { void submitPrompt(transcript); },
    [submitPrompt]
  );

  // FIX 7: single renderMessageContent per message using discriminated union
  const renderMessageContent = useCallback(
    (message: ChatMessage) => {
      if (message.role === "user") {
        return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
      }

      const parsed = parseAssistantContent(message.content);

      switch (parsed.kind) {
        case "error":
          return <p className="text-rose-400 font-semibold">{parsed.message}</p>;
        case "job":
          return (
            <JobDetailsCard
              job={parsed.data}
              pageUrl={currentUrl}
              onAnalyzeFit={() => void submitPrompt("Analyze match")}
            />
          );
        case "match":
          return <MatchAnalysisCard analysis={parsed.data} onSubmitPrompt={submitPrompt} />;
        case "cover":
          return <CoverLetterCard coverLetter={parsed.data} />;
        case "autofill":
          return <AutofillConfirmationCard confirmation={parsed.data} />;
        case "orchestration":
          return (
            <OrchestrationResultCard
              result={parsed.data}
              currentUrl={currentUrl}
              onSubmitPrompt={submitPrompt}
            />
          );
        default:
          return <Markdown content={message.content} />;
      }
    },
    [currentUrl, submitPrompt]
  );

  if (ui.showProfile) {
    return <ProfileSettings onBack={() => setUiFlag("showProfile", false)} />;
  }

  return (
    <main className="flex h-screen min-h-0 flex-col font-sans bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="flex h-[52px] items-center justify-between border-b border-[rgba(255,255,255,0.06)] px-4 shrink-0 bg-[var(--bg-primary)]">
        {/* Left Side: Logo & Title */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex items-center justify-center text-[#ff6b35] shrink-0">
            <Search size={18} className="stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-[13px] font-bold text-zinc-100 tracking-wide leading-tight">Hunter</h1>
            <span className="text-[10px] text-zinc-500 font-medium leading-none">AI Browser Copilot</span>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={clearHistory}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-400/10 transition cursor-pointer"
            title="Clear Chat"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={toggleTheme}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer"
            title="Toggle Theme"
          >
            {settings?.theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button
            onClick={() => setUiFlag("showProfile", true)}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer"
            title="Settings & Profile"
          >
            <User size={14} />
          </button>
          {settings?.sidebarPinned && (
            <>
              <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5"></div>
              <button
                onClick={() => window.parent.postMessage({ source: "ai-job-agent-sidebar", type: "CLOSE_SIDEBAR" }, "*")}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition cursor-pointer"
                title="Close Sidebar"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Developer Mode Agent Status Panel */}
      {settings?.developerMode && (
        <div className="px-3.5 py-1.5 border-b border-[rgba(255,255,255,0.08)] bg-zinc-950/40 flex items-center justify-between text-[8.5px] font-mono shrink-0 select-none overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${agentState?.isActive ? "bg-emerald-500 animate-pulse-glow" : "bg-[#ff6b35]"}`} />
              <span className="text-zinc-400">Hunter: <strong className="text-zinc-300 uppercase">{agentState?.isActive ? "RUNNING" : "READY"}</strong></span>
            </span>
            <span className="text-zinc-800">|</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span>Tools:</span>
              <strong className="text-zinc-300">14</strong>
            </span>
            <span className="text-zinc-800">|</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span>Confidence:</span>
              {/* FIX 4: formatConfidence no longer returns "92%" for undefined */}
              <strong className="text-[#ff6b35]">{formatConfidence(agentState?.confidence)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className="flex items-center gap-1" title="Reasoning Engine: Active">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              <span className="text-[7.5px] text-zinc-500 uppercase tracking-wider font-semibold">Reasoning</span>
            </span>
            <span className="flex items-center gap-1" title="Memory System: Active">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              <span className="text-[7.5px] text-zinc-500 uppercase tracking-wider font-semibold">Memory</span>
            </span>
            <span className="flex items-center gap-1" title="Reflection Engine: Active">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              <span className="text-[7.5px] text-zinc-500 uppercase tracking-wider font-semibold">Reflection</span>
            </span>
          </div>
        </div>
      )}

      {settings?.developerMode && (
        <DeveloperPanel
          agentState={agentState}
          logs={executionLogs}
          metrics={agentMetrics}
          memory={longMemory}
          healthChecks={healthChecks}
        />
      )}

      {/* Pinned Active Agent Status Card */}
      {agentState && agentState.isActive && (
        <div className="mx-3.5 my-2.5 rounded-xl border border-zinc-800 bg-[#111111] p-3 space-y-2 text-[12px] font-sans animate-fade-in shadow-sm shrink-0 select-none">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-100">
              Current Goal: <span className="font-normal text-zinc-300">{agentState.goal || "Orchestrating workflow"}</span>
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400 text-[11px]">
              <span className="truncate pr-4">
                Current Step: <strong className="text-zinc-200 font-medium">{agentState.currentStep.replace("Thinking:", "").replace(/_/g, " ").trim()}</strong>
              </span>
              <span className="shrink-0 font-medium">{agentState.progress}%</span>
            </div>
            <div className="w-full bg-[#090909] rounded-full h-1 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${agentState.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <section className="min-h-0 flex-1 overflow-y-auto px-3.5 py-4 custom-scrollbar space-y-4">
        {isLoadingHistory ? (
          <div className="flex h-full items-center justify-center text-xs font-mono text-zinc-500">
            <Loader2 className="mr-2 animate-spin text-[#ff6b35]" size={14} />
            INITIALIZING CORE ENGINE...
          </div>
        ) : messages.length === 0 && !(agentState?.isActive) ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b35]/10 text-[#ff6b35] mb-4 shadow-sm border border-[#ff6b35]/20">
              <Search size={22} className="stroke-[2.5]" />
            </div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-wide">Hunter is ready</h2>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 max-w-[200px] mt-1 leading-relaxed">
              Ask Hunter to analyze a job, match your resume, or fill application forms.
            </p>
          </div>
        ) : (
          /* Conversation Stream */
          <div className="grid gap-3 font-sans">
            {messages.map((message) => {
              // FIX 7: parse once per message, no repeated JSON.parse calls
              const parsed = message.role === "assistant" ? parseAssistantContent(message.content) : null;
              const fullWidth = parsed ? isFullWidthKind(parsed.kind) : false;

              return (
                <article
                  key={message.id}
                  className={`max-w-[88%] text-[13px] leading-relaxed transition ${fullWidth
                    ? "mr-auto w-full animate-msg-left"
                    : message.role === "user"
                      ? "ml-auto user-bubble px-3.5 py-2.5 rounded-2xl rounded-tr-none shadow-md animate-msg-right"
                      : "mr-auto animate-msg-left"
                    }`}
                >
                  {message.role === "assistant" && !fullWidth ? (
                    <div className="flex gap-2.5 items-start">
                      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#111111] border border-[rgba(255,255,255,0.08)] text-[#ff6b35]">
                        <Bot size={13} />
                      </div>
                      <div className="assistant-bubble min-w-0 flex-1 border border-[rgba(255,255,255,0.08)] bg-[#111111] text-zinc-100 px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm">
                        {renderMessageContent(message)}
                      </div>
                    </div>
                  ) : (
                    renderMessageContent(message)
                  )}
                </article>
              );
            })}

            {isSending && !(agentState?.isActive) && (
              <article className="mr-auto max-w-[88%] animate-msg-left">
                <div className="flex gap-2.5 items-start">
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#111111] border border-[rgba(255,255,255,0.08)] text-[#ff6b35] animate-pulse-glow">
                    <Bot size={13} />
                  </div>
                  <div className="assistant-bubble inline-flex flex-col gap-2 border border-[rgba(255,255,255,0.08)] bg-[#111111] px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <span className="bounce-dot" />
                      <span className="bounce-dot" />
                      <span className="bounce-dot" />
                    </div>
                    <span className="text-[10px] font-semibold animate-shimmer">
                      Hunter is planning goal execution...
                    </span>
                  </div>
                </div>
              </article>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>

      {error && (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs leading-5 text-rose-400 font-mono">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="bg-[var(--bg-primary)] flex flex-col shrink-0 px-3.5 pb-3">
        {/* Input form */}
        <form
          className="border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-[16px] flex items-center p-2 transition-all duration-200 focus-within:border-[#ff6b35]/50 shadow-sm"
          onSubmit={sendMessage}
        >
          <label htmlFor="chat-input" className="sr-only">Message to Hunter</label>
          <textarea
            id="chat-input"
            className="flex-1 min-h-[36px] max-h-32 resize-none bg-transparent border-0 outline-none text-[14px] leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-sans p-2 focus:ring-0 focus:outline-none ml-1 custom-scrollbar"
            disabled={isSending}
            placeholder="Ask Hunter anything..."
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitPrompt(input);
              }
            }}
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-2 mr-1">
            <VoiceInput
              disabled={isSending}
              onError={setError}
              onTranscriptChange={updateVoiceTranscript}
              onTranscriptSubmit={submitVoiceTranscript}
            />
            <button
              className="h-[32px] w-[32px] shrink-0 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
              disabled={isSending || input.trim().length === 0}
              type="submit"
            >
              {isSending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            </button>
          </div>
        </form>

        {/* Small Suggested actions/chips (Visible below input when Hunter is idle) */}
        {!(agentState?.isActive) && (
          <div className="suggestion-chip-wrapper relative flex items-center mt-2.5">
            {showLeftArrow && (
              <button
                type="button"
                onClick={() => scrollChips("left")}
                className="suggestion-scroll-btn"
                style={{ left: "4px" }}
                title="Scroll Left"
              >
                <ChevronLeft size={12} />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={checkScroll}
              className="flex overflow-x-auto gap-1.5 py-1.5 hide-scrollbar w-full"
            >
              <div className="flex gap-1.5 min-w-max px-8 cursor-pointer">
                {[
                  { label: "Analyze job", icon: <Sparkles size={11} className="text-[#ff6b35] stroke-[2]" /> },
                  { label: "Match resume", icon: <Award size={11} className="stroke-[2]" /> },
                  { label: "Cover letter", icon: <PenTool size={11} className="stroke-[2]" /> },
                  { label: "Autofill form", icon: <Zap size={11} className="stroke-[2] fill-current text-amber-500" /> },
                  { label: "Summarize page", icon: <FileText size={11} className="stroke-[2]" /> },
                  { label: "Company research", icon: <Building2 size={11} className="stroke-[2]" /> }
                ].map((chip, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={isSending}
                    onClick={() => void submitPrompt(chip.label)}
                    className="suggestion-chip px-2.5 py-1"
                  >
                    {chip.icon}
                    <span className="ml-1">{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {showRightArrow && (
              <button
                type="button"
                onClick={() => scrollChips("right")}
                className="suggestion-scroll-btn"
                style={{ right: "4px" }}
                title="Scroll Right"
              >
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
};