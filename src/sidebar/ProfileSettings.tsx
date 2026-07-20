import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, X, Loader2, Check, User, Mail, Phone, Award, FileText, 
  Copy, Download, Trash2, ChevronDown, ChevronUp, Linkedin, Globe, 
  Github, Briefcase, GraduationCap, Sparkles, Plus, AlertTriangle, CheckCircle 
} from "lucide-react";
import { storage } from "../shared/storage";
import { extractTextFromPdf } from "../shared/pdfExtractor";
import type { UserProfile, ResumeRecord, ProjectItem, ExperienceItem, EducationItem, SkillItem } from "../shared/types/storage";

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
    gitHub: "",
    avatar: "",
    currentRole: "",
    yearsOfExperience: "0",
    location: "",
    availability: "Available",
    preferredJobType: "Full-time",
    atsScore: 75,
    aiConfidenceScore: 82,
    lastResumeAnalysis: "",
    resumes: [],
    summary: "",
    primaryTechStack: [],
    strongestSkills: [],
    weakAreas: [],
    recommendedSkills: [],
    careerLevel: "Mid-level",
    targetRoles: [],
    resumeQuality: "Good",
    missingKeywords: [],
    skillsGrouped: {
      languages: [],
      frameworks: [],
      ai: [],
      backend: [],
      frontend: [],
      cloud: [],
      devops: [],
      databases: [],
      tools: []
    },
    projects: [],
    experienceTimeline: [],
    educationList: [],
    certifications: [],
    awards: [],
    languagesList: [],
    publications: [],
    preferences: {
      desiredRoles: [],
      preferredLocations: [],
      salaryRange: "",
      remotePreference: "any",
      noticePeriod: "",
      visaStatus: "",
      openToWork: true
    },
    aiMemory: {
      preferredResumeId: "",
      preferredRole: "",
      preferredTechnologies: [],
      interviewHistory: [],
      companiesApplied: [],
      applicationsSent: [],
      recruitersContacted: [],
      rejectedCompanies: [],
      offers: [],
      favoriteCoverLetterStyle: "Professional & Direct"
    },
    careerInsights: []
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
  const [skillCategory, setSkillCategory] = useState<keyof Required<UserProfile>["skillsGrouped"]>("languages");
  const [skillLevel, setSkillLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Advanced");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [expandedLetterId, setExpandedLetterId] = useState<string | null>(null);
  const [copiedLetterId, setCopiedLetterId] = useState<string | null>(null);

  useEffect(() => {
    storage.get("profile").then((storedProfile) => {
      if (storedProfile) {
        setProfile((prev) => ({
          ...prev,
          ...storedProfile,
          skillsGrouped: {
            languages: storedProfile.skillsGrouped?.languages || [],
            frameworks: storedProfile.skillsGrouped?.frameworks || [],
            ai: storedProfile.skillsGrouped?.ai || [],
            backend: storedProfile.skillsGrouped?.backend || [],
            frontend: storedProfile.skillsGrouped?.frontend || [],
            cloud: storedProfile.skillsGrouped?.cloud || [],
            devops: storedProfile.skillsGrouped?.devops || [],
            databases: storedProfile.skillsGrouped?.databases || [],
            tools: storedProfile.skillsGrouped?.tools || []
          },
          projects: storedProfile.projects || [],
          experienceTimeline: storedProfile.experienceTimeline || [],
          educationList: storedProfile.educationList || [],
          certifications: storedProfile.certifications || [],
          awards: storedProfile.awards || [],
          languagesList: storedProfile.languagesList || [],
          publications: storedProfile.publications || [],
          resumes: storedProfile.resumes || [],
          preferences: {
            desiredRoles: storedProfile.preferences?.desiredRoles || [],
            preferredLocations: storedProfile.preferences?.preferredLocations || [],
            salaryRange: storedProfile.preferences?.salaryRange || "",
            remotePreference: storedProfile.preferences?.remotePreference || "any",
            noticePeriod: storedProfile.preferences?.noticePeriod || "",
            visaStatus: storedProfile.preferences?.visaStatus || "",
            openToWork: storedProfile.preferences?.openToWork !== false
          },
          aiMemory: {
            preferredResumeId: storedProfile.aiMemory?.preferredResumeId || "",
            preferredRole: storedProfile.aiMemory?.preferredRole || "",
            preferredTechnologies: storedProfile.aiMemory?.preferredTechnologies || [],
            interviewHistory: storedProfile.aiMemory?.interviewHistory || [],
            companiesApplied: storedProfile.aiMemory?.companiesApplied || [],
            applicationsSent: storedProfile.aiMemory?.applicationsSent || [],
            recruitersContacted: storedProfile.aiMemory?.recruitersContacted || [],
            rejectedCompanies: storedProfile.aiMemory?.rejectedCompanies || [],
            offers: storedProfile.aiMemory?.offers || [],
            favoriteCoverLetterStyle: storedProfile.aiMemory?.favoriteCoverLetterStyle || "Professional & Direct"
          },
          careerInsights: storedProfile.careerInsights || []
        }));
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

      const response = await chrome.runtime.sendMessage({
        type: "PARSE_RESUME",
        resumeText: text
      });

      if (response && response.ok && response.profile) {
        const parsed = response.profile;

        const strengthScore = Math.min(
          99,
          Math.max(
            40,
            Math.round(
              ((parsed.aiConfidenceScore || 70) +
                (parsed.atsScore || 70) +
                Math.min(20, (parsed.skills?.length || 0) * 2) +
                Math.min(15, (parsed.experienceTimeline?.length || 0) * 5)) /
                2
            )
          )
        );

        const suggestedImprovements =
          (parsed.careerInsights && parsed.careerInsights.length > 0
            ? parsed.careerInsights
            : null) ||
          [
            parsed.missingKeywords?.length
              ? `Add keywords: ${parsed.missingKeywords.slice(0, 5).join(", ")}`
              : "",
            !(parsed.experienceTimeline && parsed.experienceTimeline.length)
              ? "Add quantified work experience with dates and impact metrics"
              : "",
            !(parsed.projects && parsed.projects.length)
              ? "Include 1–2 projects with tech stack and outcomes"
              : "",
            "Prefer action verbs and measurable results in bullet points"
          ].filter(Boolean);

        const newResume: ResumeRecord = {
          id: crypto.randomUUID(),
          name: file.name,
          role: parsed.currentRole || profile.currentRole || "Software Developer",
          uploadedAt: new Date().toISOString(),
          text,
          atsScore: parsed.atsScore || 78,
          readability: Math.min(99, Math.round((parsed.aiConfidenceScore || 75) * 0.95 + 8)),
          strengthScore,
          missingSkills: parsed.missingKeywords || [],
          suggestedImprovements
        };

        const updatedProfile: UserProfile = {
          ...profile,
          ...parsed,
          name: parsed.name || profile.name,
          email: parsed.email || profile.email,
          phone: parsed.phone || profile.phone,
          linkedIn: parsed.linkedIn || profile.linkedIn || "",
          portfolio: parsed.portfolio || profile.portfolio || "",
          gitHub: parsed.gitHub || profile.gitHub || "",
          skills:
            parsed.skills && parsed.skills.length > 0
              ? parsed.skills
              : profile.skills,
          experience: parsed.experience || profile.experience,
          summary: parsed.summary || profile.summary || "",
          currentRole: parsed.currentRole || profile.currentRole || "",
          yearsOfExperience: parsed.yearsOfExperience || profile.yearsOfExperience || "0",
          location: parsed.location || profile.location || "",
          careerLevel: parsed.careerLevel || profile.careerLevel || "Mid-level",
          primaryTechStack: parsed.primaryTechStack?.length
            ? parsed.primaryTechStack
            : profile.primaryTechStack || [],
          strongestSkills: parsed.strongestSkills?.length
            ? parsed.strongestSkills
            : profile.strongestSkills || [],
          weakAreas: parsed.weakAreas?.length ? parsed.weakAreas : profile.weakAreas || [],
          recommendedSkills: parsed.recommendedSkills?.length
            ? parsed.recommendedSkills
            : profile.recommendedSkills || [],
          targetRoles: parsed.targetRoles?.length ? parsed.targetRoles : profile.targetRoles || [],
          resumeQuality: parsed.resumeQuality || profile.resumeQuality || "Good",
          missingKeywords: parsed.missingKeywords?.length
            ? parsed.missingKeywords
            : profile.missingKeywords || [],
          skillsGrouped: parsed.skillsGrouped || profile.skillsGrouped || {
            languages: [], frameworks: [], ai: [], backend: [], frontend: [],
            cloud: [], devops: [], databases: [], tools: []
          },
          projects:
            parsed.projects && parsed.projects.length > 0
              ? parsed.projects
              : profile.projects || [],
          experienceTimeline:
            parsed.experienceTimeline && parsed.experienceTimeline.length > 0
              ? parsed.experienceTimeline
              : profile.experienceTimeline || [],
          educationList:
            parsed.educationList && parsed.educationList.length > 0
              ? parsed.educationList
              : profile.educationList || [],
          certifications: parsed.certifications?.length
            ? parsed.certifications
            : profile.certifications || [],
          awards: parsed.awards?.length ? parsed.awards : profile.awards || [],
          languagesList: parsed.languagesList?.length
            ? parsed.languagesList
            : profile.languagesList || [],
          publications: parsed.publications?.length
            ? parsed.publications
            : profile.publications || [],
          careerInsights: suggestedImprovements,
          resumeFileName: file.name,
          resumes: [newResume],
          atsScore: parsed.atsScore || 78,
          aiConfidenceScore: parsed.aiConfidenceScore || 78,
          lastResumeAnalysis: new Date().toLocaleDateString()
        };

        setProfile(updatedProfile);
        setSuccessMsg(
          "Resume parsed successfully. Review every section below — contact, skills, experience, projects, education, and extras — then save."
        );
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
    if (!cleanSkill) return;

    const skillItem: SkillItem = {
      name: cleanSkill,
      confidence: skillLevel === "Advanced" ? 90 : skillLevel === "Intermediate" ? 75 : 50,
      source: "manual",
      experience: "1 year",
      usedIn: [],
      relatedProjects: []
    };

    const currentGroup = profile.skillsGrouped?.[skillCategory] || [];
    if (currentGroup.some(s => s.name.toLowerCase() === cleanSkill.toLowerCase())) {
      setError("Skill already exists in this category.");
      return;
    }

    const updatedGrouped = {
      ...profile.skillsGrouped!,
      [skillCategory]: [...currentGroup, skillItem]
    };

    setProfile((prev) => ({
      ...prev,
      skills: Array.from(new Set([...prev.skills, cleanSkill])),
      skillsGrouped: updatedGrouped
    }));
    setSkillInput("");
  };

  const handleRemoveSkill = (category: keyof Required<UserProfile>["skillsGrouped"], skillName: string) => {
    const currentGroup = profile.skillsGrouped?.[category] || [];
    const updatedGrouped = {
      ...profile.skillsGrouped!,
      [category]: currentGroup.filter(s => s.name !== skillName)
    };

    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillName),
      skillsGrouped: updatedGrouped
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

  // Helper arrays update functions
  const handleAddExperienceItem = () => {
    const newItem: ExperienceItem = { company: "", role: "", duration: "", responsibilities: [], achievements: [], technologies: [] };
    setProfile(prev => ({
      ...prev,
      experienceTimeline: [...(prev.experienceTimeline || []), newItem]
    }));
  };

  const handleUpdateExperienceItem = (index: number, field: keyof ExperienceItem, value: any) => {
    const timeline = [...(profile.experienceTimeline || [])];
    timeline[index] = { ...timeline[index], [field]: value };
    setProfile(prev => ({ ...prev, experienceTimeline: timeline }));
  };

  const handleRemoveExperienceItem = (index: number) => {
    setProfile(prev => ({
      ...prev,
      experienceTimeline: (prev.experienceTimeline || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleAddProjectItem = () => {
    const newItem: ProjectItem = { title: "", description: "", technologies: [], gitHub: "", portfolio: "", role: "", impact: "" };
    setProfile(prev => ({
      ...prev,
      projects: [...(prev.projects || []), newItem]
    }));
  };

  const handleUpdateProjectItem = (index: number, field: keyof ProjectItem, value: any) => {
    const projects = [...(profile.projects || [])];
    projects[index] = { ...projects[index], [field]: value };
    setProfile(prev => ({ ...prev, projects }));
  };

  const handleRemoveProjectItem = (index: number) => {
    setProfile(prev => ({
      ...prev,
      projects: (prev.projects || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleAddEducationItem = () => {
    const newItem: EducationItem = { institute: "", degree: "", cgpa: "", graduation: "" };
    setProfile(prev => ({
      ...prev,
      educationList: [...(prev.educationList || []), newItem]
    }));
  };

  const handleUpdateEducationItem = (index: number, field: keyof EducationItem, value: any) => {
    const educationList = [...(profile.educationList || [])];
    educationList[index] = { ...educationList[index], [field]: value };
    setProfile(prev => ({ ...prev, educationList }));
  };

  const handleRemoveEducationItem = (index: number) => {
    setProfile(prev => ({
      ...prev,
      educationList: (prev.educationList || []).filter((_, idx) => idx !== index)
    }));
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      <header className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface-overlay)] px-4 py-3.5 shrink-0 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] shrink-0 shadow-sm">
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

        {/* AI Resume Insights Card */}
        {profile.resumeFileName && (
          <div className="premium-card p-4 rounded-2xl space-y-4 bg-zinc-50 dark:bg-zinc-900/40">
            <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[var(--text-primary)]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 font-mono">
                AI Resume Insights
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3.5 text-xs">
              <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="font-bold text-zinc-500">Resume Strength:</span>
                <p className="text-base font-black mt-1 text-[var(--text-primary)]">{profile.resumes?.[0]?.strengthScore || 75}%</p>
              </div>
              <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="font-bold text-zinc-500">ATS Readiness:</span>
                <p className="text-base font-black mt-1 text-[var(--text-primary)]">{profile.resumes?.[0]?.atsScore || profile.atsScore || 78}%</p>
              </div>
              <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="font-bold text-zinc-500">Parse Confidence:</span>
                <p className="text-base font-black mt-1 text-[var(--text-primary)]">{profile.aiConfidenceScore || 78}%</p>
              </div>
              <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="font-bold text-zinc-500">Career Level:</span>
                <p className="text-sm font-black mt-0.5 text-[var(--text-primary)]">{profile.careerLevel || "—"}</p>
              </div>
              <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)] col-span-2">
                <span className="font-bold text-zinc-500">Detected Snapshot:</span>
                <p className="text-[11px] mt-1 text-[var(--text-secondary)] leading-relaxed">
                  {[
                    profile.currentRole,
                    profile.yearsOfExperience ? `${profile.yearsOfExperience} yrs exp` : "",
                    profile.location,
                    profile.experienceTimeline?.length ? `${profile.experienceTimeline.length} jobs` : "",
                    profile.projects?.length ? `${profile.projects.length} projects` : "",
                    profile.educationList?.length ? `${profile.educationList.length} education` : "",
                    profile.skills?.length ? `${profile.skills.length} skills` : ""
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Upload a resume to auto-detect profile fields."}
                </p>
              </div>
              <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)] col-span-2">
                <span className="font-bold text-zinc-500">Top Inferred Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(profile.strongestSkills || profile.skills || []).slice(0, 8).map(s => (
                    <span key={s} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">{s}</span>
                  ))}
                </div>
              </div>
              {profile.missingKeywords && profile.missingKeywords.length > 0 && (
                <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)] col-span-2">
                  <span className="font-bold text-zinc-500">Missing Key Skills (Gap):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.missingKeywords.map(s => (
                      <span key={s} className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {profile.resumes?.[0]?.suggestedImprovements && (
                <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-color)] col-span-2">
                  <span className="font-bold text-zinc-500">Suggested Improvements:</span>
                  <ul className="list-disc list-inside mt-1 text-zinc-600 dark:text-zinc-400 space-y-0.5">
                    {profile.resumes[0].suggestedImprovements.map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                Location
              </label>
              <input
                type="text"
                value={profile.location || ""}
                onChange={(e) => setProfile((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="City, Country"
                className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                Current Role
              </label>
              <div className="relative">
                <Briefcase size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={profile.currentRole || ""}
                  onChange={(e) => setProfile((prev) => ({ ...prev, currentRole: e.target.value }))}
                  placeholder="e.g. Software Engineer"
                  className="premium-input h-10 w-full rounded-xl pl-10 pr-4 text-[12.5px] outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                Years of Experience
              </label>
              <input
                type="text"
                value={profile.yearsOfExperience || ""}
                onChange={(e) => setProfile((prev) => ({ ...prev, yearsOfExperience: e.target.value }))}
                placeholder="e.g. 3"
                className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
                Career Level
              </label>
              <select
                value={profile.careerLevel || "Mid-level"}
                onChange={(e) => setProfile((prev) => ({ ...prev, careerLevel: e.target.value }))}
                className="premium-input h-10 w-full rounded-xl px-3 text-[12.5px] outline-none font-medium"
              >
                <option value="Fresher">Fresher</option>
                <option value="Entry-level">Entry-level</option>
                <option value="Junior">Junior</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Executive">Executive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Professional Summary
            </label>
            <textarea
              value={profile.summary || ""}
              onChange={(e) => setProfile((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder="AI-extracted professional summary from your resume..."
              rows={3}
              className="premium-input w-full resize-none rounded-xl px-3.5 py-2.5 text-[12.5px] outline-none font-medium leading-relaxed font-sans"
            />
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

        {/* Skills Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Skills Catalog
            </h3>
          </div>

          <div>
            <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-secondary)]/30 p-2.5 rounded-xl border border-[var(--border-color)]">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add skill (e.g. React, Python)"
                className="premium-input h-10 flex-1 rounded-xl px-3.5 text-[12.5px] outline-none"
              />
              <div className="flex gap-2 shrink-0">
                <select
                  value={skillCategory}
                  onChange={(e) => setSkillCategory(e.target.value as any)}
                  className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-2 text-xs outline-none text-[var(--text-secondary)] font-bold"
                >
                  <option value="languages">Languages</option>
                  <option value="frameworks">Frameworks</option>
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                  <option value="ai">AI / ML</option>
                  <option value="databases">Databases</option>
                  <option value="cloud">Cloud</option>
                  <option value="devops">DevOps</option>
                  <option value="tools">Tools</option>
                </select>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as any)}
                  className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-2 text-xs outline-none text-[var(--text-secondary)] font-bold"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[var(--text-primary)] hover:opacity-90 px-4 text-xs font-bold text-[var(--bg-primary)] transition-all shadow-md uppercase shrink-0"
                >
                  Add
                </button>
              </div>
            </form>

            {/* Categorized Skills list */}
            {profile.skillsGrouped && (
              <div className="mt-4 space-y-3">
                {(Object.keys(profile.skillsGrouped) as Array<keyof typeof profile.skillsGrouped>).map(cat => {
                  const items = profile.skillsGrouped?.[cat] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={String(cat)} className="space-y-1.5">
                      <h4 className="text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">{String(cat)}</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((skill: SkillItem) => (
                          <span
                            key={skill.name}
                            className="skill-chip-premium"
                          >
                            {skill.name}
                            <span className="text-[8px] opacity-75 font-mono ml-1">
                              ({skill.confidence >= 90 ? "Advanced" : skill.confidence >= 70 ? "Intermediate" : "Beginner"})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(cat, skill.name)}
                              className="skill-chip-premium-delete"
                            >
                              <X size={11} className="stroke-[2.5]" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Experience Timeline Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Work Experience Timeline
            </h3>
            <button
              onClick={handleAddExperienceItem}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:opacity-80 flex items-center gap-1"
            >
              <Plus size={12} /> Add Job
            </button>
          </div>

          <div className="space-y-4">
            {profile.experienceTimeline && profile.experienceTimeline.length > 0 ? (
              profile.experienceTimeline.map((exp, idx) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-900/20 border border-[var(--border-color)] rounded-xl space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] font-black font-mono text-zinc-400">JOB #{idx + 1}</span>
                    <button 
                      onClick={() => handleRemoveExperienceItem(idx)}
                      className="text-rose-500 hover:text-rose-700 text-[10px] font-bold"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => handleUpdateExperienceItem(idx, "company", e.target.value)}
                      placeholder="Company (e.g. Google)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => handleUpdateExperienceItem(idx, "role", e.target.value)}
                      placeholder="Role (e.g. Software Engineer)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={exp.duration}
                      onChange={(e) => handleUpdateExperienceItem(idx, "duration", e.target.value)}
                      placeholder="Duration (e.g. Jun 2024 - Present)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={exp.location || ""}
                      onChange={(e) => handleUpdateExperienceItem(idx, "location", e.target.value)}
                      placeholder="Location (e.g. Mountain View, CA)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                  </div>
                  <textarea
                    value={exp.responsibilities.join("\n")}
                    onChange={(e) => handleUpdateExperienceItem(idx, "responsibilities", e.target.value.split("\n"))}
                    placeholder="Description (one bullet point per line)..."
                    rows={3}
                    className="premium-input w-full resize-none p-2.5 text-xs rounded-lg leading-relaxed font-sans"
                  />
                  <input
                    type="text"
                    value={exp.technologies.join(", ")}
                    onChange={(e) => handleUpdateExperienceItem(idx, "technologies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    placeholder="Technologies Used (comma-separated, e.g. React, Docker)"
                    className="premium-input h-9 px-3 text-xs rounded-lg"
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No experience parsed from resume yet.</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] font-mono">
              Overall Work Experience Summary
            </label>
            <textarea
              value={profile.experience}
              onChange={(e) => setProfile((prev) => ({ ...prev, experience: e.target.value }))}
              placeholder="Provide a general summary of your career background..."
              rows={4}
              className="premium-input w-full resize-none rounded-xl px-3.5 py-2.5 text-[12.5px] outline-none font-medium leading-relaxed font-sans"
            />
          </div>
        </div>

        {/* Projects Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Projects
            </h3>
            <button
              onClick={handleAddProjectItem}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:opacity-80 flex items-center gap-1"
            >
              <Plus size={12} /> Add Project
            </button>
          </div>

          <div className="space-y-4">
            {profile.projects && profile.projects.length > 0 ? (
              profile.projects.map((proj, idx) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-900/20 border border-[var(--border-color)] rounded-xl space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] font-black font-mono text-zinc-400">PROJECT #{idx + 1}</span>
                    <button 
                      onClick={() => handleRemoveProjectItem(idx)}
                      className="text-rose-500 hover:text-rose-700 text-[10px] font-bold"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={proj.title}
                      onChange={(e) => handleUpdateProjectItem(idx, "title", e.target.value)}
                      placeholder="Project Title"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={proj.role || ""}
                      onChange={(e) => handleUpdateProjectItem(idx, "role", e.target.value)}
                      placeholder="Role (e.g. Fullstack Developer)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={proj.gitHub}
                      onChange={(e) => handleUpdateProjectItem(idx, "gitHub", e.target.value)}
                      placeholder="GitHub Link URL"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={proj.portfolio}
                      onChange={(e) => handleUpdateProjectItem(idx, "portfolio", e.target.value)}
                      placeholder="Live Demo Portfolio URL"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                  </div>
                  <textarea
                    value={proj.description}
                    onChange={(e) => handleUpdateProjectItem(idx, "description", e.target.value)}
                    placeholder="Short description of what was built..."
                    rows={2}
                    className="premium-input w-full resize-none p-2.5 text-xs rounded-lg leading-relaxed font-sans"
                  />
                  <input
                    type="text"
                    value={proj.technologies.join(", ")}
                    onChange={(e) => handleUpdateProjectItem(idx, "technologies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    placeholder="Technologies Used (comma-separated, e.g. React, Node.js)"
                    className="premium-input h-9 px-3 text-xs rounded-lg"
                  />
                  <input
                    type="text"
                    value={proj.impact || ""}
                    onChange={(e) => handleUpdateProjectItem(idx, "impact", e.target.value)}
                    placeholder="Metrics / Project Impact (e.g. Accelerated build times by 30%)"
                    className="premium-input h-9 px-3 text-xs rounded-lg"
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No projects parsed from resume yet.</p>
            )}
          </div>
        </div>

        {/* Certifications, Awards, Languages */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1 flex items-center gap-1.5">
            <Award size={14} className="text-[var(--text-primary)]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Certifications, Awards & Languages
            </h3>
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Certifications (comma-separated)
            </label>
            <input
              type="text"
              value={(profile.certifications || []).join(", ")}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  certifications: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                }))
              }
              placeholder="e.g. AWS Certified Cloud Practitioner, Google Data Analytics"
              className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Awards & Honors (comma-separated)
            </label>
            <input
              type="text"
              value={(profile.awards || []).join(", ")}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  awards: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                }))
              }
              placeholder="e.g. Dean's List 2024, Hackathon Winner"
              className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Spoken Languages (comma-separated)
            </label>
            <input
              type="text"
              value={(profile.languagesList || []).join(", ")}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  languagesList: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                }))
              }
              placeholder="e.g. English, Spanish, Hindi"
              className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-mono">
              Target Roles (comma-separated)
            </label>
            <input
              type="text"
              value={(profile.targetRoles || []).join(", ")}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  targetRoles: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                }))
              }
              placeholder="e.g. Frontend Engineer, Full Stack Developer"
              className="premium-input h-10 w-full rounded-xl px-3.5 text-[12.5px] outline-none font-medium"
            />
          </div>
        </div>

        {/* Education Card */}
        <div className="premium-card p-4 rounded-2xl space-y-4">
          <div className="border-b border-zinc-200/40 pb-2 dark:border-zinc-800/40 mb-1 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-mono">
              Education
            </h3>
            <button
              onClick={handleAddEducationItem}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:opacity-80 flex items-center gap-1"
            >
              <Plus size={12} /> Add Education
            </button>
          </div>

          <div className="space-y-4">
            {profile.educationList && profile.educationList.length > 0 ? (
              profile.educationList.map((edu, idx) => (
                <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-900/20 border border-[var(--border-color)] rounded-xl space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] font-black font-mono text-zinc-400">INSTITUTE #{idx + 1}</span>
                    <button 
                      onClick={() => handleRemoveEducationItem(idx)}
                      className="text-rose-500 hover:text-rose-700 text-[10px] font-bold"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={edu.institute}
                      onChange={(e) => handleUpdateEducationItem(idx, "institute", e.target.value)}
                      placeholder="College / Institute Name"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => handleUpdateEducationItem(idx, "degree", e.target.value)}
                      placeholder="Degree (e.g. B.S. in Computer Science)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={edu.graduation}
                      onChange={(e) => handleUpdateEducationItem(idx, "graduation", e.target.value)}
                      placeholder="Graduation Year (e.g. 2024)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                    <input
                      type="text"
                      value={edu.cgpa}
                      onChange={(e) => handleUpdateEducationItem(idx, "cgpa", e.target.value)}
                      placeholder="GPA / CGPA (e.g. 8.5 / 10)"
                      className="premium-input h-9 px-3 text-xs rounded-lg"
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No education history parsed from resume yet.</p>
            )}
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
              <FileText size={13} className="text-[var(--text-primary)]" />
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
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 dark:bg-[var(--bg-primary)]/20 shadow-sm overflow-hidden hover:border-[var(--border-color)]/80 transition duration-200"
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
                                <Check size={11} className="stroke-[3]" />
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
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-extrabold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-tertiary)] transition duration-155 shadow-sm active:scale-95"
                          >
                            <Download size={11} />
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteLetter(letter.id)}
                            title="Delete cover letter draft"
                            className="flex h-7.5 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-extrabold text-rose-600 hover:bg-rose-50 dark:border-[var(--border-color)] dark:bg-[var(--bg-primary)] dark:text-rose-450 dark:hover:bg-rose-950/20 transition duration-155 shadow-sm active:scale-95"
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
            ? "bg-emerald-600 text-white"
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
