import React, { useState, useEffect, useRef } from "react";
import { Upload, X, Loader2, Check, User, Mail, Phone, Award, FileText, Copy, Download, Trash2, ChevronDown, ChevronUp, Linkedin, Globe, Github } from "lucide-react";
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
    portfolio: "",
    gitHub: ""
  });

  const [preferredTone, setPreferredTone] = useState("");
  const [favoriteTechnologies, setFavoriteTechnologies] = useState("");
  const [currentProjects, setCurrentProjects] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

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
          portfolio: storedProfile.portfolio || "",
          gitHub: storedProfile.gitHub || ""
        });
      }
    });

    storage.get("longTermMemory").then((memoryVal) => {
      if (memoryVal) {
        setPreferredTone(memoryVal.preferredTone || "");
        setFavoriteTechnologies((memoryVal.favoriteTechnologies || []).join(", "));
        setCurrentProjects((memoryVal.currentProjects || []).join(", "));
        setInterviewNotes(memoryVal.interviewNotes || "");
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
          portfolio: parsed.portfolio || profile.portfolio || "",
          gitHub: parsed.gitHub || profile.gitHub || ""
        });
        setSuccessMsg("Resume loaded successfully. Review the details, then save your profile.");
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

      const memoryVal = (await storage.get("longTermMemory")) || {};
      const updatedMemory = {
        ...memoryVal,
        preferredTone,
        favoriteTechnologies: favoriteTechnologies.split(",").map(s => s.trim()).filter(Boolean),
        currentProjects: currentProjects.split(",").map(s => s.trim()).filter(Boolean),
        interviewNotes,
        updatedAt: new Date().toISOString()
      };
      await storage.set("longTermMemory", updatedMemory);

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
    <div className="flex h-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      <header className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface-overlay)] px-4 py-3.5 shrink-0 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] dark:bg-[var(--bg-tertiary)] dark:border dark:border-[var(--border-color)] shrink-0 shadow-sm">
            <User size={14} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="truncate text-xs font-black uppercase tracking-wider text-[var(--text-primary)] font-display">Resume & Profile</h1>
            <span className="text-[9px] font-bold text-[var(--text-muted)] leading-none">Settings & Tailoring</span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-[10px] font-black tracking-wider text-zinc-500 hover:text-zinc-900 dark:text-[var(--text-secondary)] dark:hover:text-[var(--text-primary)] px-2.5 transition duration-155 uppercase"
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
              ? "border-[var(--border-hover)] bg-[var(--bg-tertiary)]/50 pointer-events-none"
              : "border-[var(--border-color)] bg-[var(--bg-secondary)]/30 hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]/80 dark:bg-[var(--bg-primary)]/20 dark:hover:bg-[var(--bg-primary)]/50 shadow-sm"
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
                <Loader2 className="mx-auto animate-spin text-[var(--accent)]" size={22} />
                <p className="text-xs font-bold text-[var(--accent)]">
                  Parsing resume.....
                </p>
              </div>
            ) : profile.resumeFileName ? (
              <div className="space-y-1.5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20 group-hover:scale-110 transition duration-300">
                  <FileText size={20} className="stroke-[2]" />
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[220px] mx-auto">
                  {profile.resumeFileName}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] leading-none">
                  Click or drag here to upload a different resume
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] group-hover:scale-110 group-hover:text-[var(--accent)] transition duration-300">
                  <Upload size={18} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--text-secondary)]">
                    Upload your resume
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
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

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              GitHub URL
            </label>
            <div className="relative">
              <Github size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
              <input
                type="url"
                value={profile.gitHub || ""}
                onChange={(e) => setProfile((prev) => ({ ...prev, gitHub: e.target.value }))}
                placeholder="E.g. https://github.com/username"
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
                className="h-10 rounded-xl bg-[var(--text-primary)] hover:opacity-90 px-4 text-xs font-bold text-[var(--bg-primary)] transition-all shadow-md active:scale-95 uppercase tracking-wider font-sans shrink-0"
              >
                Add
              </button>
            </form>
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border border-[var(--border-color)]/40 bg-[var(--bg-secondary)]/20 dark:bg-[var(--bg-primary)]/20 p-2.5 rounded-xl backdrop-blur-sm dark:border-[var(--border-color)]/50">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="skill-chip-premium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="skill-chip-premium-delete"
                      title={`Remove ${skill}`}
                    >
                      <X size={11} className="stroke-[2.5]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] font-mono">
              Work Experience Summary
            </label>
            <textarea
              value={profile.experience}
              onChange={(e) => setProfile((prev) => ({ ...prev, experience: e.target.value }))}
              placeholder="Provide a summary of your career background..."
              rows={4}
              className="premium-input w-full resize-none rounded-xl px-3.5 py-2.5 text-[12.5px] outline-none font-medium leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Personal AI Memory & Preferences Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Personal AI Memory & Preferences
            </h3>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Preferred Tone / Professional Voice
            </label>
            <input
              type="text"
              value={preferredTone}
              onChange={(e) => setPreferredTone(e.target.value)}
              placeholder="E.g. Professional yet conversational, enthusiastic"
              className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Favorite Technologies (comma-separated)
            </label>
            <input
              type="text"
              value={favoriteTechnologies}
              onChange={(e) => setFavoriteTechnologies(e.target.value)}
              placeholder="E.g. React, TypeScript, Python, Node.js"
              className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Current Projects (comma-separated)
            </label>
            <input
              type="text"
              value={currentProjects}
              onChange={(e) => setCurrentProjects(e.target.value)}
              placeholder="E.g. Hunter AI Copilot, Personal Portfolio Website"
              className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Interview Notes & Context
            </label>
            <textarea
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="E.g. Looking for Senior AI roles, prefer remote working, interested in developer tools..."
              rows={4}
              className="premium-input w-full resize-none rounded-xl px-3.5 py-2.5 text-[12.5px] outline-none font-medium leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Saved Cover Letters Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-[var(--border-color)]/40 pb-2 dark:border-[var(--border-color)]/40 mb-1 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] font-mono flex items-center gap-1.5">
              <FileText size={13} className="text-[var(--accent)]" />
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
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 dark:bg-[var(--bg-primary)]/20 shadow-sm overflow-hidden hover:border-[var(--accent)]/30 transition duration-200"
                  >
                    <div
                      onClick={() => setExpandedLetterId(isExpanded ? null : letter.id)}
                      className="flex cursor-pointer items-center justify-between gap-3 p-3 bg-[var(--bg-tertiary)]/20 dark:bg-[var(--bg-secondary)]/20"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold text-[var(--text-primary)]">
                          {letter.company}
                        </p>
                        <p className="truncate text-[10px] text-[var(--text-muted)] mt-0.5">
                          {letter.role} · {new Date(letter.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--text-muted)] shrink-0">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[var(--border-color)]/60 p-3 dark:border-[var(--border-color)]/60 bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]/40 space-y-3">
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border-color)]/80 dark:border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 p-2.5 dark:bg-black/30 text-[11px] leading-relaxed text-[var(--text-secondary)] font-mono whitespace-pre-wrap select-text custom-scrollbar">
                          {letter.content}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleCopyLetter(letter.id, letter.content)}
                            title="Copy to clipboard"
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-extrabold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-tertiary)] transition duration-150 shadow-sm active:scale-95"
                          >
                            {copiedLetterId === letter.id ? (
                              <>
                                <Check size={11} className="text-[var(--accent)] stroke-[3]" />
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
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-extrabold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-tertiary)] transition duration-150 shadow-sm active:scale-95"
                          >
                            <Download size={11} />
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteLetter(letter.id)}
                            title="Delete cover letter draft"
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-extrabold text-[var(--danger)] hover:bg-[var(--danger-faint)] dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-[var(--danger)] dark:hover:bg-[var(--danger)]/20 transition duration-155 shadow-sm active:scale-95"
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
            <p className="text-xs text-[var(--text-muted)] italic">No tailored cover letters generated yet.</p>
          )}
        </div>
      </div>

      <footer className="border-t border-[var(--border-color)] bg-[var(--surface-overlay)] p-4 shrink-0 shadow-inner">
        <button
          onClick={handleSaveProfile}
          disabled={isSaving || isParsing}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl font-bold text-xs transition-all duration-300 shadow-md hover:shadow-lg active:scale-98 uppercase tracking-wider font-sans ${saveSuccess
            ? "bg-[var(--success)] text-[var(--bg-primary)]"
            : "bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-60"
            }`}
        >
          {isSaving && <Loader2 size={14} className="animate-spin text-[var(--accent)]" />}
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
