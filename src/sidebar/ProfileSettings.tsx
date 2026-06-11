import React, { useState, useEffect, useRef } from "react";
import { Upload, X, Loader2, Check, User, Mail, Phone, Award, FileText, Copy, Download, Trash2, ChevronDown, ChevronUp, Linkedin, Globe } from "lucide-react";
import { storage } from "../shared/storage";
import { extractTextFromPdf } from "../shared/pdfExtractor";
import type { UserProfile, CoverLetterRecord } from "../shared/types/storage";

interface ProfileSettingsProps {
  onBack: () => void;
}

export const ProfileSettings = ({ onBack }: ProfileSettingsProps) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    skills: [],
    experience: "",
    resumeFileName: "",
    linkedIn: "",
    portfolio: ""
  });

  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [skillInput, setSkillInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coverLetters, setCoverLetters] = useState<CoverLetterRecord[]>([]);
  const [expandedLetterId, setExpandedLetterId] = useState<string | null>(null);
  const [copiedLetterId, setCopiedLetterId] = useState<string | null>(null);

  useEffect(() => {
    storage.get("profile").then((storedProfile) => {
      if (storedProfile) {
        setProfile({
          name: storedProfile.name || "",
          email: storedProfile.email || "",
          phone: storedProfile.phone || "",
          skills: Array.isArray(storedProfile.skills) ? storedProfile.skills : [],
          experience: storedProfile.experience || "",
          resumeFileName: storedProfile.resumeFileName || "",
          linkedIn: storedProfile.linkedIn || "",
          portfolio: storedProfile.portfolio || ""
        });
      }
    });

    storage.get("coverLetters").then((letters) => {
      if (letters) {
        setCoverLetters(letters);
      }
    });
  }, []);

  const handleCopyLetter = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedLetterId(id);
      setTimeout(() => setCopiedLetterId(null), 2000);
    } catch (err) {
      console.error("Failed to copy letter:", err);
    }
  };

  const handleDownloadLetter = (company: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cover_Letter_${company.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteLetter = async (id: string) => {
    try {
      const updated = coverLetters.filter((letter) => letter.id !== id);
      await storage.set("coverLetters", updated);
      setCoverLetters(updated);
      if (expandedLetterId === id) {
        setExpandedLetterId(null);
      }
    } catch (err) {
      console.error("Failed to delete letter:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file only.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setIsParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractTextFromPdf(arrayBuffer);

      if (!text.trim()) {
        throw new Error("No readable text could be extracted from this PDF.");
      }

      // Send the text to the background script for parsing
      const response = await chrome.runtime.sendMessage({
        type: "PARSE_RESUME",
        resumeText: text
      });

      if (response && response.ok && response.profile) {
        const parsed = response.profile as UserProfile;
        setProfile({
          name: parsed.name || profile.name,
          email: parsed.email || profile.email,
          phone: parsed.phone || profile.phone,
          skills: parsed.skills && parsed.skills.length > 0 ? parsed.skills : profile.skills,
          experience: parsed.experience || profile.experience,
          resumeFileName: file.name,
          linkedIn: parsed.linkedIn || profile.linkedIn || "",
          portfolio: parsed.portfolio || profile.portfolio || ""
        });
        setSuccessMsg("Resume parsed successfully!");
      } else {
        throw new Error(response?.error || "Hunter was unable to extract structured details from the resume.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract and parse resume.");
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSkill = skillInput.trim();
    if (cleanSkill && !profile.skills.includes(cleanSkill)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, cleanSkill]
      }));
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove)
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError("");
    setSuccessMsg("");
    setSaveSuccess(false);

    try {
      await storage.set("profile", profile);
      setSuccessMsg("Profile saved successfully!");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError("Failed to save profile to storage.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col mesh-gradient text-zinc-900 dark:text-zinc-100 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200/60 bg-white/75 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/75 px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-zinc-900 dark:border dark:border-zinc-800 shrink-0 shadow-sm">
            <User size={14} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="truncate text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white font-display">Resume & Profile</h1>
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 leading-none">Settings & Tailoring</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-[10px] font-black tracking-wider text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-2.5 transition duration-155 uppercase"
        >
          Back to Chat
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
        {/* Error / Success Alerts */}
        {error && (
          <div className="rounded-2xl bg-rose-50/85 p-3 text-xs text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 backdrop-blur-sm animate-fade-in shadow-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl bg-emerald-50/85 p-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 backdrop-blur-sm animate-fade-in shadow-sm flex items-center gap-1.5">
            <Check size={13} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
            {successMsg}
          </div>
        )}

        {/* Drag & Drop PDF Resume Card */}
        <div className="premium-card p-4 rounded-2xl">
          <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
            Resume PDF
          </label>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group flex flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center cursor-pointer transition-all duration-300 ${isParsing
              ? "border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/20 pointer-events-none"
              : "border-zinc-200 bg-white/30 dark:border-zinc-800/40 hover:border-[#f97316]/50 hover:bg-white/80 dark:bg-zinc-950/20 dark:hover:bg-zinc-950/50 shadow-sm"
              }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            {isParsing ? (
              <div className="space-y-2.5">
                <Loader2 className="mx-auto animate-spin text-[#f97316]" size={22} />
                <p className="text-xs font-bold text-[#f97316]">
                  Parsing resume.....
                </p>
              </div>
            ) : profile.resumeFileName ? (
              <div className="space-y-1.5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20 group-hover:scale-110 transition duration-300">
                  <FileText size={20} className="stroke-[2]" />
                </div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[220px] mx-auto">
                  {profile.resumeFileName}
                </p>
                <p className="text-[10px] text-zinc-455 dark:text-zinc-500 leading-none">
                  Click or drag here to upload a different resume
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 group-hover:scale-110 group-hover:text-[#f97316] transition duration-300">
                  <Upload size={18} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Upload your resume
                  </p>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500">
                    Drag and drop or click to browse (PDF only)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personal Details Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Personal Details
            </h3>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Full Name
            </label>
            <div className="relative">
              <User size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="E.g. John Doe"
                className="premium-input h-10 w-full rounded-xl pl-10 pr-4 text-[12.5px] outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Email Address
            </label>
            <div className="relative">
              <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="E.g. john@example.com"
                className="premium-input h-10 w-full rounded-xl pl-10 pr-4 text-[12.5px] outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Phone Number
            </label>
            <div className="relative">
              <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="E.g. +1 555 123 4567"
                className="premium-input h-10 w-full rounded-xl pl-10 pr-4 text-[12.5px] outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Professional Profiles Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Professional Links
            </h3>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              LinkedIn URL
            </label>
            <div className="relative">
              <Linkedin size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="url"
                value={profile.linkedIn || ""}
                onChange={(e) => setProfile((prev) => ({ ...prev, linkedIn: e.target.value }))}
                placeholder="E.g. https://linkedin.com/in/username"
                className="premium-input h-10 w-full rounded-xl pl-10 pr-4 text-[12.5px] outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Portfolio URL
            </label>
            <div className="relative">
              <Globe size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="url"
                value={profile.portfolio || ""}
                onChange={(e) => setProfile((prev) => ({ ...prev, portfolio: e.target.value }))}
                placeholder="E.g. https://portfolio.com"
                className="premium-input h-10 w-full rounded-xl pl-10 pr-4 text-[12.5px] outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Skills & Experience Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Skills & Experience
            </h3>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Skills
            </label>
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add skill (e.g. React, Python)"
                className="premium-input h-10 flex-1 rounded-xl px-3.5 text-[12.5px] outline-none"
              />
              <button
                type="submit"
                className="h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-4 text-xs font-bold text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all shadow-md active:scale-95 uppercase tracking-wider font-sans shrink-0"
              >
                Add
              </button>
            </form>
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border border-zinc-200/40 bg-white/20 dark:bg-zinc-950/20 p-2 rounded-xl backdrop-blur-sm dark:border-zinc-800/50">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 pl-2.5 pr-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200/40 shadow-sm transition-all hover:scale-[1.02]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-zinc-450 hover:text-[#f97316] dark:text-zinc-500 dark:hover:text-[#f97316] transition"
                    >
                      <X size={10} className="stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Work Experience Summary
            </label>
            <textarea
              value={profile.experience}
              onChange={(e) => setProfile((prev) => ({ ...prev, experience: e.target.value }))}
              placeholder="Provide a summary of your career background..."
              rows={4}
              className="premium-input w-full resize-none rounded-xl px-3.5 py-2.5 text-[12.5px] outline-none font-medium"
            />
          </div>
        </div>

        {/* Saved Cover Letters Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1.5">
              <FileText size={13} className="text-[#f97316]" />
              Tailored Cover Letters ({coverLetters.length})
            </h2>
          </div>
          {coverLetters.length > 0 ? (
            <div className="space-y-3">
              {coverLetters.map((letter) => {
                const isExpanded = expandedLetterId === letter.id;
                return (
                  <div
                    key={letter.id}
                    className="rounded-xl border border-zinc-200 bg-white/40 dark:border-zinc-800 dark:bg-zinc-950/20 shadow-sm overflow-hidden hover:border-[#f97316]/30 transition duration-200"
                  >
                    <div
                      onClick={() => setExpandedLetterId(isExpanded ? null : letter.id)}
                      className="flex cursor-pointer items-center justify-between gap-3 p-3 bg-zinc-50/20 dark:bg-zinc-955/20"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold text-zinc-900 dark:text-white">
                          {letter.company}
                        </p>
                        <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-450 mt-0.5">
                          {letter.role} · {new Date(letter.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 shrink-0">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-zinc-200/60 p-3 dark:border-zinc-800/60 bg-white dark:bg-zinc-950/40 space-y-3">
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 p-2.5 dark:bg-black/30 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-355 font-mono whitespace-pre-wrap select-text custom-scrollbar">
                          {letter.content}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleCopyLetter(letter.id, letter.content)}
                            title="Copy to clipboard"
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-[10px] font-extrabold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-350 dark:hover:bg-zinc-950 transition duration-150 shadow-sm active:scale-95"
                          >
                            {copiedLetterId === letter.id ? (
                              <>
                                <Check size={11} className="text-[#f97316] stroke-[3]" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                Copy
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDownloadLetter(letter.company, letter.content)}
                            title="Download letter as text file"
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-[10px] font-extrabold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-350 dark:hover:bg-zinc-950 transition duration-150 shadow-sm active:scale-95"
                          >
                            <Download size={11} />
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteLetter(letter.id)}
                            title="Delete cover letter draft"
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-[10px] font-extrabold text-rose-600 hover:bg-rose-50 dark:border-zinc-800 dark:bg-black dark:text-rose-400 dark:hover:bg-rose-955/20 transition duration-150 shadow-sm active:scale-95"
                          >
                            <Trash2 size={11} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No tailored cover letters generated yet.</p>
          )}
        </div>
      </div>

      <footer className="border-t border-zinc-200/60 bg-white/75 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/75 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] dark:shadow-none shrink-0">
        <button
          onClick={handleSaveProfile}
          disabled={isSaving || isParsing}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl font-bold text-xs transition-all duration-300 shadow-md hover:shadow-lg active:scale-98 uppercase tracking-wider font-sans ${saveSuccess
            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10"
            : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-60"
            }`}
        >
          {isSaving && <Loader2 size={14} className="animate-spin text-[#f97316]" />}
          {saveSuccess ? (
            <>
              <Check size={14} className="animate-scale-up text-white stroke-[3]" />
              Saved Successfully!
            </>
          ) : (
            "Save Profile"
          )}
        </button>
      </footer>
    </div>
  );
};
