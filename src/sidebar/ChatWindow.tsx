import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Trash2, X, MapPin, DollarSign, Award, Check, Plus, User, Sparkles, AlertCircle, Copy, Download, Activity, ChevronDown, ChevronUp, FileSearch, ClipboardList, Zap, PenTool, Briefcase } from "lucide-react";
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

const MatchAnalysisCard = ({
  analysis,
  onSubmitPrompt
}: {
  analysis: MatchAnalysis;
  onSubmitPrompt?: (prompt: string) => void;
}) => {
  const score = analysis.matchScore;

  const getMatchLabel = (val: number) => {
    if (val >= 80) return { text: "Great Match", colorClass: "text-emerald-600 dark:text-emerald-400" };
    if (val >= 50) return { text: "Good Match", colorClass: "text-amber-600 dark:text-amber-400" };
    return { text: "Low Match", colorClass: "text-rose-600 dark:text-rose-400" };
  };

  const getMatchCircleColor = (val: number) => {
    if (val >= 80) return "stroke-emerald-500";
    if (val >= 50) return "stroke-amber-500";
    return "stroke-rose-500";
  };

  const radius = 24;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="my-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-[#18181b]">
      {/* Visual Header Grid: Donut Chart + Skills Grid */}
      <div className="flex gap-4 items-center border-b border-zinc-200/60 pb-4 dark:border-zinc-800">
        {/* Left: Donut Match Score Chart */}
        <div className="flex flex-col items-center justify-center shrink-0 pr-4 border-r border-zinc-150 dark:border-zinc-800">
          <div className="relative flex items-center justify-center w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-zinc-100 dark:stroke-zinc-800"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                className={getMatchCircleColor(score)}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-black text-zinc-900 dark:text-white">
              {score}%
            </span>
          </div>
          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mt-1.5 leading-none">
            Match Score
          </span>
          <span className={`text-[10px] font-black mt-0.5 leading-none ${getMatchLabel(score).colorClass}`}>
            {getMatchLabel(score).text}
          </span>
        </div>

        {/* Right: Skills Lists Side-by-side */}
        <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
          {/* Matched Skills */}
          <div className="min-w-0">
            <h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Matched Skills
            </h4>
            <ul className="space-y-1 text-[11px] leading-normal font-medium text-zinc-700 dark:text-zinc-300">
              {analysis.matchedSkills.slice(0, 4).map((skill, index) => (
                <li key={index} className="flex items-center gap-1.5 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate" title={skill}>{skill}</span>
                </li>
              ))}
              {analysis.matchedSkills.length > 4 && (
                <li className="pl-3">
                  <span className="inline-block rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                    +{analysis.matchedSkills.length - 4} more
                  </span>
                </li>
              )}
              {analysis.matchedSkills.length === 0 && (
                <li className="text-[10px] text-zinc-500 italic">None</li>
              )}
            </ul>
          </div>

          {/* Missing Skills */}
          <div className="min-w-0">
            <h4 className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Missing Skills
            </h4>
            <ul className="space-y-1 text-[11px] leading-normal font-medium text-zinc-700 dark:text-zinc-300">
              {analysis.missingSkills.slice(0, 4).map((skill, index) => (
                <li key={index} className="flex items-center gap-1.5 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                  <span className="truncate" title={skill}>{skill}</span>
                </li>
              ))}
              {analysis.missingSkills.length > 4 && (
                <li className="pl-3">
                  <span className="inline-block rounded bg-zinc-100 dark:bg-zinc-800 px-1 py-0.2 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                    +{analysis.missingSkills.length - 4} more
                  </span>
                </li>
              )}
              {analysis.missingSkills.length === 0 && (
                <li className="text-[10px] text-zinc-500 italic">All matched!</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Highlights & Recommendations */}
      {analysis.recommendations && (
        <div className="mt-3.5 space-y-1.5">
          <h4 className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Key Highlights
          </h4>
          <div className="rounded-xl border border-zinc-200/60 bg-[#fffaf5] dark:bg-zinc-900/10 p-3.5 dark:border-zinc-800 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            <ul className="list-disc list-inside space-y-1">
              {analysis.recommendations
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .map((line, idx) => (
                  <li key={idx} className="marker:text-[#f97316]">
                    {parseInlineMarkdown(line.replace(/^-\s*/, "").trim())}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {/* Interactive Action Buttons */}
      {onSubmitPrompt && (
        <div className="flex flex-wrap gap-2 mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800">
          <button
            onClick={() => onSubmitPrompt("Analyze match")}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-950"
          >
            <Sparkles size={11} className="text-[#f97316]" />
            View Analysis
          </button>
          <button
            onClick={() => onSubmitPrompt("Improve resume")}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-950"
          >
            <ClipboardList size={11} className="text-zinc-555 dark:text-zinc-400" />
            Improve Resume
          </button>
          <button
            onClick={() => onSubmitPrompt("Generate cover letter")}
            className="flex h-7 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-950"
          >
            <PenTool size={11} className="text-zinc-555 dark:text-zinc-400" />
            Generate Cover Letter
          </button>
        </div>
      )}
    </div>
  );
};

interface CoverLetter {
  id: string;
  company: string;
  role: string;
  content: string;
  createdAt: string;
}

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
    <div className="my-2 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#18181b] overflow-hidden">
      {/* File metadata row */}
      <div className="flex items-center justify-between gap-3 p-3.5 bg-zinc-50/20 dark:bg-zinc-900/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-orange-50 text-[#f97316] dark:bg-orange-950/20 dark:text-orange-400 flex items-center justify-center border border-orange-100/50 dark:border-orange-900/30">
            <ClipboardList size={20} className="stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={`Cover Letter - ${coverLetter.company}.pdf`}>
              Cover Letter - {coverLetter.company}.pdf
            </h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Tailored Letter · 1.2 KB
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={handleCopy}
            title="Copy text"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-605 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-950 transition"
          >
            {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleDownload}
            title="Download cover letter (.txt)"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-350 dark:hover:bg-zinc-950 transition"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Accordion toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-[10px] font-bold text-zinc-550 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-250 bg-zinc-50/50 dark:bg-black/20 border-t border-zinc-150 dark:border-zinc-800 transition"
      >
        <span>{isExpanded ? "Hide Preview" : "View Letter Preview"}</span>
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Expandable Preview content panel */}
      {isExpanded && (
        <div className="p-3.5 border-t border-zinc-150 dark:border-zinc-800 bg-white dark:bg-black/30">
          <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200/60 bg-white p-3 dark:border-zinc-800 dark:bg-black/50 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap select-text">
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
  onAnalyzeFit
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
      if (exists) {
        setIsSaved(true);
      }
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
        createdAt: new Date().toISOString()
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
    <div className="my-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-[#18181b]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate" title={job.title}>
            {job.title}
          </h3>
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate" title={job.company}>
            {job.company}
          </p>
        </div>

        <div className="flex gap-1 shrink-0">
          {onAnalyzeFit && (
            <button
              onClick={onAnalyzeFit}
              className="flex h-7 items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-950"
            >
              <Sparkles size={11} className="text-amber-500" />
              Match
            </button>
          )}

          <button
            onClick={handleTrackJob}
            disabled={isSaved || isSaving}
            className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm transition-all ${isSaved
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
              : "bg-black text-white hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100"
              }`}
          >
            {isSaved ? <Check size={12} /> : isSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {isSaved ? "Tracked" : "Track"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-zinc-200 pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span className="truncate"><b>Location:</b> {job.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span className="truncate"><b>Salary:</b> {job.salary}</span>
        </div>
        <div className="flex items-center gap-2">
          <Award size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
          <span className="truncate"><b>Experience:</b> {job.experience}</span>
        </div>
      </div>

      {job.skills && job.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {job.skills.map((skill, index) => (
            <span
              key={index}
              className="rounded bg-zinc-200/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

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

const AutofillConfirmationCard = ({ confirmation }: { confirmation: AutofillConfirmation }) => {
  const [status, setStatus] = useState<"pending" | "submitting" | "confirmed" | "cancelled">("pending");
  const [filledCount, setFilledCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    setStatus("submitting");
    setErrorMsg("");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        throw new Error("No active tab found.");
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "EXECUTE_AUTOFILL",
        proposals: confirmation.proposals
      });

      if (response && response.ok) {
        setFilledCount(response.filledCount);
        setStatus("confirmed");
      } else {
        throw new Error(response?.error || "Content script failed to execute autofill.");
      }
    } catch (err) {
      setStatus("pending");
      setErrorMsg(err instanceof Error ? err.message : "Error executing autofill.");
    }
  };

  const handleCancel = async () => {
    setStatus("submitting");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { type: "CANCEL_AUTOFILL" });
      }
    } catch (err) {
      console.warn("Cancel autofill signal failed", err);
    }
    setStatus("cancelled");
  };

  if (status === "confirmed") {
    return (
      <div className="my-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/15">
        <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
          <Check size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          Form Autofill Complete
        </h3>
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
          Successfully populated **{filledCount}** fields on the webpage!
        </p>
        {confirmation.highlighted.length > 0 && (
          <div className="mt-2.5 border-t border-emerald-200/50 pt-2 dark:border-emerald-900/30 text-[11px] text-zinc-600 dark:text-zinc-400">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">Manual verification required:</span>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5">
              {confirmation.highlighted.map((h, i) => (
                <li key={i} className="truncate">{h} (Highlighted on page)</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="my-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400 italic text-xs">
        Autofill proposal cancelled.
      </div>
    );
  }

  const proposalsToFill = confirmation.proposals.filter(p => p.mappedType !== "resume");
  const resumeFields = confirmation.proposals.filter(p => p.mappedType === "resume");

  return (
    <div className="my-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-[#18181b]">
      <div className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
          <Sparkles size={14} className="text-zinc-500 dark:text-zinc-400 shrink-0" />
          Autofill Form Confirmation
        </h3>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Review values before applying to page</p>
      </div>

      {errorMsg && (
        <div className="mt-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2 rounded border border-rose-200 dark:border-rose-900/50">
          {errorMsg}
        </div>
      )}

      <div className="mt-3.5 space-y-3.5 text-xs">
        {proposalsToFill.length > 0 ? (
          <div>
            <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Proposed Fields ({proposalsToFill.length})
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {proposalsToFill.map((prop) => (
                <div
                  key={prop.tempId}
                  className="flex flex-col gap-0.5 rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-black/30"
                >
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    {prop.labelText} <span className="text-[9px] font-normal text-zinc-400 font-mono">({prop.tagName})</span>
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-300 truncate font-mono text-[11px]">
                    {prop.fillValue}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500 italic">No fillable text fields found on the active page form.</div>
        )}

        {resumeFields.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center gap-1">
              <AlertCircle size={10} />
              Manual Upload Required
            </h4>
            <div className="rounded border border-amber-200 bg-amber-50/20 p-2 text-[11px] text-amber-800 dark:border-amber-900/30 dark:text-amber-400">
              For security, browser forms prevent setting files. The resume file input fields will be highlighted on the page.
            </div>
          </div>
        )}

        {confirmation.skipped.length > 0 && (
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Skipped/Empty ({confirmation.skipped.length})
            </h4>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 max-h-20 overflow-y-auto space-y-0.5 italic">
              {confirmation.skipped.map((s, idx) => (
                <div key={idx} className="truncate">• {s}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2 border-t border-zinc-200 pt-3.5 dark:border-zinc-800">
        <button
          onClick={handleConfirm}
          disabled={status === "submitting" || (proposalsToFill.length === 0 && resumeFields.length === 0)}
          className="flex-1 flex h-8 items-center justify-center gap-1 rounded bg-black text-white hover:bg-zinc-900 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-100 font-semibold text-xs transition shadow-sm"
        >
          {status === "submitting" ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <Check size={12} />
          )}
          Confirm Fill
        </button>
        <button
          onClick={handleCancel}
          disabled={status === "submitting"}
          className="flex-1 flex h-8 items-center justify-center gap-1 rounded border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-350 dark:hover:bg-zinc-950 transition font-semibold text-xs"
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
  onSubmitPrompt
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
    <div className="my-2 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#18181b] overflow-hidden text-xs">
      <div className="bg-zinc-100 dark:bg-zinc-900 px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1">
            <Bot size={13} className="text-zinc-500 shrink-0" />
            Job Application Flow
          </h3>
          <p className="text-[9px] text-zinc-500 dark:text-zinc-400 truncate max-w-[280px]">{result.summary}</p>
        </div>
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 p-2 text-[10px] border-b border-rose-100 dark:border-rose-900/30">
          <strong>Some steps failed:</strong>
          <ul className="list-disc list-inside">
            {result.errors.map((e: string, i: number) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-[10px] bg-zinc-50/50 dark:bg-black/20 font-semibold">
        {result.job && (
          <button
            onClick={() => setActiveTab("job")}
            className={`flex-1 py-2 text-center border-b-2 transition ${activeTab === "job"
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
          >
            Job Info
          </button>
        )}
        {result.match && (
          <button
            onClick={() => setActiveTab("match")}
            className={`flex-1 py-2 text-center border-b-2 transition ${activeTab === "match"
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
          >
            Match Score
          </button>
        )}
        {result.coverLetter && (
          <button
            onClick={() => setActiveTab("cover")}
            className={`flex-1 py-2 text-center border-b-2 transition ${activeTab === "cover"
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
          >
            Cover Letter
          </button>
        )}
        {result.autofill && (
          <button
            onClick={() => setActiveTab("fill")}
            className={`flex-1 py-2 text-center border-b-2 transition ${activeTab === "fill"
              ? "border-black text-black dark:border-white dark:text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
          >
            Autofill Form
          </button>
        )}
      </div>

      <div className="p-3">
        {activeTab === "job" && result.job && (
          <JobDetailsCard job={result.job} pageUrl={currentUrl} />
        )}
        {activeTab === "match" && result.match && (
          <MatchAnalysisCard analysis={result.match} onSubmitPrompt={onSubmitPrompt} />
        )}
        {activeTab === "cover" && result.coverLetter && (
          <CoverLetterCard coverLetter={result.coverLetter} />
        )}
        {activeTab === "fill" && result.autofill && (
          <AutofillConfirmationCard confirmation={result.autofill} />
        )}
      </div>
    </div>
  );
};

const isJson = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

type SendChatResponse =
  | { message: ChatMessage; history: ChatMessage[]; ok?: true }
  | { ok: false; error: string };

type ChatHistoryResponse = { history: ChatMessage[]; ok?: true } | { ok: false; error: string };

const createLocalMessage = (content: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  content,
  createdAt: new Date().toISOString()
});

const requestPageSnapshot = async (): Promise<PageSnapshot | undefined> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return undefined;
  }

  const response = (await chrome.tabs
    .sendMessage(tab.id, { type: "GET_PAGE_SNAPSHOT" })
    .catch(() => undefined)) as { snapshot?: PageSnapshot } | undefined;

  return response?.snapshot;
};

const commandPrompts = [
  {
    label: "Summarize page",
    prompt: "Summarize this page",
    description: "Quick overview of content",
    icon: FileSearch,
    iconBg: "bg-orange-50 dark:bg-orange-950/20 text-[#f97316]"
  },
  {
    label: "Extract job details",
    prompt: "Extract job",
    description: "Role, skills, salary info",
    icon: ClipboardList,
    iconBg: "bg-orange-50 dark:bg-orange-950/20 text-[#ea580c]"
  },
  {
    label: "Autofill application",
    prompt: "Autofill form",
    description: "Fill fields from your profile",
    icon: Zap,
    iconBg: "bg-orange-50 dark:bg-orange-950/20 text-[#f97316]"
  },
  {
    label: "Cover letter",
    prompt: "Generate cover letter",
    description: "Tailored for this role",
    icon: PenTool,
    iconBg: "bg-zinc-100 dark:bg-zinc-800 text-[#ea580c]"
  }
];

const getAgentColor = (agent: string) => {
  switch (agent) {
    case "JobAgent":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50";
    case "ResumeAgent":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
    case "FormAgent":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
    case "ResearchAgent":
      return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50";
    case "NavigationAgent":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
};

export const ChatWindow = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [showProfile, setShowProfile] = useState(false);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [showSteps, setShowSteps] = useState(true);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogEntry[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetricRecord[]>([]);
  const [longMemory, setLongMemory] = useState<LongTermMemory | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);

  // Find the latest MatchAnalysis score from chat history
  const latestMatchScore = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && isJson(msg.content)) {
        try {
          const obj = JSON.parse(msg.content);
          if (obj && typeof obj === "object") {
            if ("matchScore" in obj) {
              return `${obj.matchScore}%`;
            }
            if (obj.type === "orchestration_result" && obj.match?.matchScore !== undefined) {
              return `${obj.match.matchScore}%`;
            }
          }
        } catch { }
      }
    }
    return "—";
  })();

  const handleStopAgent = async () => {
    if (agentState) {
      const stoppedState: AgentState = {
        ...agentState,
        isActive: false,
        currentStep: "Execution cancelled by user.",
        progress: 100
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
      provider: settings?.provider
    };
    await storage.set("settings", newSettings);
    setSettings(newSettings);
    applyDocumentTheme(nextTheme);
  };

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url) {
        setCurrentUrl(tab.url);
      }
    });
    storage.get("settings").then((s) => {
      setSettings(s);
      applyDocumentTheme(s.theme);
    });
    storage.get("executionLogs").then(setExecutionLogs);
    storage.get("agentMetrics").then((metrics) => setAgentMetrics(Object.values(metrics)));
    storage.get("longTermMemory").then(setLongMemory);
    storage.get("healthChecks").then(setHealthChecks);

    chrome.storage.local.get("agentState").then((data) => {
      if (data.agentState) {
        setAgentState(data.agentState as AgentState);
      }
    });

    chrome.runtime
      .sendMessage({ type: "GET_CHAT_HISTORY" })
      .then((response: ChatHistoryResponse) => {
        if (!response) {
          setError("Could not load chat history.");
          return;
        }

        if ("error" in response) {
          setError(response.error);
          return;
        }

        setMessages(response.history);
      })
      .catch(() => setError("Could not load chat history."))
      .finally(() => setIsLoadingHistory(false));

    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "sync" && changes.settings?.newValue) {
        setSettings(changes.settings.newValue);
        applyDocumentTheme(changes.settings.newValue.theme);
      }

      if (areaName === "sync" && changes.chatHistory?.newValue) {
        setMessages(changes.chatHistory.newValue as ChatMessage[]);
      }

      if (areaName === "sync" && changes.executionLogs?.newValue) {
        setExecutionLogs(changes.executionLogs.newValue as ExecutionLogEntry[]);
      }

      if (areaName === "sync" && changes.agentMetrics?.newValue) {
        setAgentMetrics(Object.values(changes.agentMetrics.newValue as Record<string, AgentMetricRecord>));
      }

      if (areaName === "sync" && changes.longTermMemory?.newValue) {
        setLongMemory(changes.longTermMemory.newValue as LongTermMemory);
      }

      if (areaName === "sync" && changes.healthChecks?.newValue) {
        setHealthChecks(changes.healthChecks.newValue as HealthCheckResult[]);
      }

      if (areaName === "local" && changes.agentState) {
        setAgentState((changes.agentState.newValue as AgentState) || null);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
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
    const response = (await chrome.runtime.sendMessage({ type: "CLEAR_CHAT_HISTORY" })) as ChatHistoryResponse;

    if (!response) {
      setError("Could not clear chat history.");
      return;
    }

    if ("error" in response) {
      setError(response.error);
      return;
    }

    setMessages(response.history);
  };

  const submitPrompt = useCallback(async (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt || isSending) {
      return;
    }

    const localUserMessage = createLocalMessage(prompt);
    setMessages((current) => [...current, localUserMessage]);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const pageContext = await requestPageSnapshot();
      const response = (await chrome.runtime.sendMessage({
        type: "SEND_CHAT_MESSAGE",
        prompt,
        pageContext
      })) as SendChatResponse;

      if (!response) {
        setError("API did not return a response.");
        return;
      }

      if ("error" in response) {
        setError(response.error);
        return;
      }

      setMessages(response.history);
    } catch {
      setError("API could not respond. Check your API key, connection, and extension permissions.");
    } finally {
      setIsSending(false);
    }
  }, [isSending]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPrompt(input);
  };

  const updateVoiceTranscript = useCallback((transcript: string) => {
    setInput(transcript);
  }, []);

  const submitVoiceTranscript = useCallback(
    (transcript: string) => {
      void submitPrompt(transcript);
    },
    [submitPrompt]
  );

  if (showProfile) {
    return <ProfileSettings onBack={() => setShowProfile(false)} />;
  }

  return (
    <main className="flex h-screen min-h-0 flex-col mesh-gradient text-zinc-900 dark:text-zinc-100 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200/60 px-3 py-3 bg-white/75 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/75 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-zinc-900 dark:border dark:border-zinc-800 shrink-0 shadow-sm">
            <Briefcase size={14} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex items-baseline gap-1">
            <h1 className="truncate text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white font-display">HUNTERR</h1>
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 font-mono">v0.1.0</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="text-[10px] font-bold tracking-wider text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-2.5 transition duration-150 uppercase"
          >
            {settings?.theme === "dark" ? "LIGHT" : "DARK"}
          </button>
          <Button
            aria-label="Profile Settings"
            className="h-8 w-8 px-0"
            icon={<User size={15} />}
            variant="ghost"
            onClick={() => setShowProfile(true)}
          />
          <Button
            aria-label="Clear chat history"
            className="h-8 w-8 px-0"
            disabled={isSending || messages.length === 0}
            icon={<Trash2 size={15} />}
            variant="ghost"
            onClick={clearHistory}
          />
          <Button
            aria-label="Close sidebar"
            className="h-8 w-8 px-0 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 rounded-lg transition-colors"
            icon={<X size={15} />}
            variant="ghost"
            onClick={closeSidebar}
          />
        </div>
      </header>

      {settings?.developerMode && (
        <DeveloperPanel
          agentState={agentState}
          logs={executionLogs}
          metrics={agentMetrics}
          memory={longMemory}
          healthChecks={healthChecks}
        />
      )}

      {/* Autonomous Agent Live Dashboard */}
      {agentState && agentState.isActive && (
        <div className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-950/90 p-4 backdrop-blur-sm shadow-sm transition-all duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-650 dark:text-indigo-400 animate-pulse" />
                  Autonomous Agent Running
                </h3>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 italic truncate" title={agentState.goal}>
                Goal: {agentState.goal}
              </p>
            </div>

            <button
              onClick={handleStopAgent}
              className="flex h-7 items-center justify-center rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-rose-600 hover:border-rose-200 dark:border-zinc-800 dark:bg-black dark:text-zinc-300 dark:hover:bg-zinc-950 dark:hover:text-rose-400 dark:hover:border-rose-900/50 transition duration-150 shadow-sm shrink-0"
            >
              Stop Agent
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Active Agent:
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-sm ${getAgentColor(agentState.currentAgent)}`}>
              {agentState.currentAgent}
            </span>
          </div>

          <p className="mt-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-400 shrink-0 animate-ping" />
            {agentState.currentStep}
          </p>

          <div className="mt-2.5">
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-400 h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${agentState.progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
              <span>Progress</span>
              <span>{agentState.progress}%</span>
            </div>
          </div>

          <div className="mt-3.5 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
            >
              <span>Execution Steps ({agentState.steps?.length || 0})</span>
              {showSteps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showSteps && agentState.steps && agentState.steps.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {agentState.steps.map((step) => {
                  let icon = null;
                  let textClass = "text-zinc-500 dark:text-zinc-400";

                  if (step.status === "completed") {
                    icon = <Check size={11} className="text-emerald-600 dark:text-emerald-450 stroke-[3]" />;
                    textClass = "text-zinc-500 dark:text-zinc-500 line-through decoration-zinc-300 dark:decoration-zinc-800";
                  } else if (step.status === "running") {
                    icon = <Loader2 size={11} className="text-indigo-650 dark:text-indigo-400 animate-spin" />;
                    textClass = "text-zinc-900 dark:text-white font-bold";
                  } else if (step.status === "failed") {
                    icon = <AlertCircle size={11} className="text-rose-600 dark:text-rose-400" />;
                    textClass = "text-rose-600 dark:text-rose-400 font-semibold";
                  } else {
                    icon = <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />;
                  }

                  return (
                    <div key={step.step} className="flex items-center gap-2 text-[11px] leading-4">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {icon}
                      </div>
                      <span className={`truncate flex-1 ${textClass}`}>
                        {step.description}
                      </span>
                      {step.error && (
                        <span className="text-[9px] text-rose-500 truncate max-w-[120px] ml-auto italic" title={step.error}>
                          {step.error}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {isLoadingHistory ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="mr-2 animate-spin" size={16} />
            Loading chat
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-1 py-4">
            {/* Greeting */}
            <div className="text-center mb-6 animate-fade-in font-sans">
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white font-display tracking-tight">
                Hey, I'm Hunter
              </h2>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[240px] mx-auto">
                Your AI job application copilot. Pick an action or just ask me anything.
              </p>
            </div>

            {/* Smart Prompt Cards */}
            <div className="w-full grid grid-cols-2 gap-3">
              {commandPrompts.map((cmd, idx) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.label}
                    type="button"
                    disabled={isSending}
                    onClick={() => void submitPrompt(cmd.prompt)}
                    className="welcome-card animate-fade-in-up group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 text-left transition-all hover:shadow-md hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
                  >
                    <div className={`mb-3.5 flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${cmd.iconBg}`}>
                      <Icon size={18} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white leading-snug font-sans tracking-tight">
                      {cmd.label}
                    </h3>
                    <p className="mt-1 text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {cmd.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {messages.map((message) => {
              const isJobCard =
                message.role === "assistant" &&
                isJson(message.content) &&
                (() => {
                  try {
                    const job = JSON.parse(message.content);
                    return job && typeof job === "object" && "title" in job && "company" in job && !("error" in job);
                  } catch {
                    return false;
                  }
                })();

              const isMatchCard =
                message.role === "assistant" &&
                isJson(message.content) &&
                (() => {
                  try {
                    const match = JSON.parse(message.content);
                    return match && typeof match === "object" && "matchScore" in match && "matchedSkills" in match && !("error" in match);
                  } catch {
                    return false;
                  }
                })();

              const isCoverLetterCard =
                message.role === "assistant" &&
                isJson(message.content) &&
                (() => {
                  try {
                    const cl = JSON.parse(message.content);
                    return cl && typeof cl === "object" && "content" in cl && "company" in cl && !("error" in cl);
                  } catch {
                    return false;
                  }
                })();

              const isAutofillConfirmationCard =
                message.role === "assistant" &&
                isJson(message.content) &&
                (() => {
                  try {
                    const obj = JSON.parse(message.content);
                    return obj && typeof obj === "object" && obj.type === "autofill_confirmation";
                  } catch {
                    return false;
                  }
                })();

              const isOrchestrationResultCard =
                message.role === "assistant" &&
                isJson(message.content) &&
                (() => {
                  try {
                    const obj = JSON.parse(message.content);
                    return obj && typeof obj === "object" && obj.type === "orchestration_result";
                  } catch {
                    return false;
                  }
                })();

              const renderMessageContent = () => {
                if (message.role === "user") {
                  return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
                }
                if (message.role === "assistant" && isJson(message.content)) {
                  try {
                    const obj = JSON.parse(message.content);
                    if (obj && typeof obj === "object") {
                      if ("error" in obj) {
                        return <p className="text-red-500 font-semibold">{obj.error}</p>;
                      }
                      if ("title" in obj && "company" in obj) {
                        return <JobDetailsCard job={obj} pageUrl={currentUrl} onAnalyzeFit={() => void submitPrompt("Analyze match")} />;
                      }
                      if ("matchScore" in obj && "matchedSkills" in obj) {
                        return <MatchAnalysisCard analysis={obj} onSubmitPrompt={submitPrompt} />;
                      }
                      if ("content" in obj && "company" in obj) {
                        return <CoverLetterCard coverLetter={obj} />;
                      }
                      if (obj.type === "autofill_confirmation") {
                        return <AutofillConfirmationCard confirmation={obj} />;
                      }
                      if (obj.type === "orchestration_result") {
                        return <OrchestrationResultCard result={obj} currentUrl={currentUrl} onSubmitPrompt={submitPrompt} />;
                      }
                    }
                  } catch {
                    // Fallback
                  }
                }
                return <Markdown content={message.content} />;
              };

              const isFullWidth = isJobCard || isMatchCard || isCoverLetterCard || isAutofillConfirmationCard || isOrchestrationResultCard;

              return (
                <article
                  className={`max-w-[88%] text-[13px] leading-relaxed transition ${isFullWidth
                    ? "mr-auto w-full animate-msg-left"
                    : message.role === "user"
                      ? "ml-auto user-bubble text-white px-3.5 py-2.5 rounded-2xl rounded-tr-none shadow-md animate-msg-right"
                      : "mr-auto animate-msg-left"
                    }`}
                  key={message.id}
                >
                  {message.role === "assistant" && !isFullWidth ? (
                    <div className="flex gap-2.5 items-start">
                      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-zinc-900 text-[#f97316] dark:bg-zinc-800 dark:text-[#f97316]">
                        <Bot size={13} />
                      </div>
                      <div className="assistant-bubble min-w-0 flex-1 border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800/80 dark:bg-[#18181b] dark:text-zinc-100 px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm">
                        {renderMessageContent()}
                      </div>
                    </div>
                  ) : (
                    renderMessageContent()
                  )}
                </article>
              );
            })}
            {isSending ? (
              <article className="mr-auto max-w-[88%] animate-msg-left">
                <div className="flex gap-2.5 items-start">
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-zinc-900 text-[#f97316] dark:bg-zinc-800 dark:text-[#f97316] animate-pulse-glow">
                    <Bot size={13} />
                  </div>
                  <div className="assistant-bubble inline-flex flex-col gap-2 border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-[#18181b] px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                      <span className="bounce-dot"></span>
                      <span className="bounce-dot"></span>
                      <span className="bounce-dot"></span>
                    </div>
                    <span className="text-[10px] font-semibold animate-shimmer">
                      Hunter is thinking
                    </span>
                  </div>
                </div>
              </article>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>      {error ? (
        <div className="border-t border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-700 dark:border-zinc-800 dark:bg-[#18181b] dark:text-zinc-300">
          {error}
        </div>
      ) : null}

      {/* Unified Footer Actions Panel */}
      <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/75 backdrop-blur-md dark:bg-zinc-950/75 flex flex-col shrink-0">
        {/* Match Score Display */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-50/20 dark:bg-black/10 border-b border-zinc-200/40 dark:border-zinc-800/40">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
            Match Score
          </span>
          <span className="text-base font-black text-[#f97316] font-mono leading-none">
            {latestMatchScore}
          </span>
        </div>

        {/* Primary Autofill Button */}
        <div className="p-3 pb-1.5">
          <button
            type="button"
            disabled={isSending}
            onClick={() => void submitPrompt("Autofill form")}
            className="w-full bg-[#f97316] text-[#18181b] font-bold text-xs h-10 rounded-xl flex items-center justify-center gap-2 hover:bg-[#fb923c] transition-all shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider font-sans"
          >
            {isSending ? (
              <Loader2 className="animate-spin" size={13} />
            ) : (
              <Zap size={13} className="fill-current stroke-none" />
            )}
            Run Autofill Agent
          </button>
        </div>

        {/* Quick suggestions capsules */}
        {messages.length > 0 && (
          <div className="flex gap-1.5 px-3 py-1.5 overflow-x-auto custom-scrollbar bg-zinc-50/10 dark:bg-transparent">
            {commandPrompts.filter(c => c.prompt !== "Autofill form").map((command) => {
              const Icon = command.icon;
              return (
                <button
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-full border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-[10.5px] font-semibold text-zinc-700 dark:text-zinc-355 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSending}
                  key={command.label}
                  type="button"
                  onClick={() => void submitPrompt(command.prompt)}
                >
                  <Icon size={11} className="text-[#f97316]" />
                  {command.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Input Form */}
        <form className="glass-input flex gap-2 p-3 pt-2" onSubmit={sendMessage}>
          <textarea
            className="min-h-10 max-h-28 flex-1 resize-none rounded-xl border border-zinc-200 bg-white/50 px-3 py-2 text-[13px] leading-relaxed text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#f97316] focus:bg-white focus:ring-4 focus:ring-[#f97316]/10 dark:border-zinc-800 dark:bg-black/50 dark:text-white dark:placeholder:text-zinc-650 dark:focus:border-[#f97316] dark:focus:ring-[#f97316]/15 backdrop-blur-md"
            disabled={isSending}
            placeholder="Ask anything about this page..."
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <VoiceInput
            disabled={isSending}
            onError={setError}
            onTranscriptChange={updateVoiceTranscript}
            onTranscriptSubmit={submitVoiceTranscript}
          />
          <button
            aria-label="Send message"
            className="h-10 w-10 shrink-0 rounded-xl bg-zinc-900 text-white dark:bg-zinc-800 flex items-center justify-center hover:bg-[#f97316] hover:text-[#18181b] dark:hover:bg-[#f97316] dark:hover:text-[#18181b] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            disabled={isSending || input.trim().length === 0}
            type="submit"
          >
            {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </main>
  );
};
