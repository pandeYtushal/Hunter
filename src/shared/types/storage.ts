import type { ChatMessage, ThemeMode } from "./messages";
import type { AgentMetricRecord } from "../../debug/AgentMetrics";
import type { ExecutionLogEntry } from "../../debug/ExecutionLogger";
import type { HealthCheckResult } from "../../ai/healthCheck";
import type { LongTermMemory } from "../../types/Memory";

export interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  sourceUrl: string;
  status: "saved" | "applying" | "applied" | "interviewing";
  createdAt: string;
}

export interface AgentSettings {
  theme: ThemeMode;
  sidebarPinned: boolean;
  userName: string;
  developerMode: boolean;
  ollamaUrl?: string;
  provider?: "gemini" | "openai" | "anthropic" | "groq" | "openrouter" | "deepseek" | "ollama";
  model?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: "gemini" | "openai" | "anthropic" | "groq" | "openrouter" | "deepseek" | "ollama" | "none";
  streaming?: boolean;
  visionProvider?: "gemini" | "openai" | "anthropic" | "openrouter" | "ollama" | "none";
  embeddingProvider?: "gemini" | "openai" | "openrouter" | "ollama" | "none";
  maxSessionTokens?: number;
  sidebarWidth?: number;
  sidebarHeight?: number;
}

export interface ApprovalState {
  action: string;
  message: string;
  status: "pending" | "approved" | "declined";
}

export interface ApiKeys {
  apiKey?: string; // Gemini
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  openrouterApiKey?: string;
  deepseekApiKey?: string;
}

export interface ResumeRecord {
  id: string;
  name: string;
  role: string;
  uploadedAt: string;
  text: string;
  atsScore?: number;
  readability?: number;
  strengthScore?: number;
  missingSkills?: string[];
  suggestedImprovements?: string[];
}

export interface SkillItem {
  name: string;
  confidence: number;
  source: "resume" | "manual";
  experience: string;
  usedIn: string[];
  relatedProjects: string[];
}

export interface SkillCategoryGroup {
  languages: SkillItem[];
  frameworks: SkillItem[];
  ai: SkillItem[];
  backend: SkillItem[];
  frontend: SkillItem[];
  cloud: SkillItem[];
  devops: SkillItem[];
  databases: SkillItem[];
  tools: SkillItem[];
}

export interface ProjectItem {
  title: string;
  description: string;
  technologies: string[];
  gitHub: string;
  portfolio: string;
  role: string;
  impact: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  duration: string;
  location?: string;
  responsibilities: string[];
  technologies: string[];
  achievements: string[];
}

export interface EducationItem {
  institute: string;
  degree: string;
  cgpa: string;
  graduation: string;
}

export interface CareerPreferences {
  desiredRoles: string[];
  preferredLocations: string[];
  salaryRange: string;
  remotePreference: "remote" | "hybrid" | "onsite" | "any";
  noticePeriod: string;
  visaStatus: string;
  openToWork: boolean;
}

export interface AiMemory {
  preferredResumeId: string;
  preferredRole: string;
  preferredTechnologies: string[];
  interviewHistory: string[];
  companiesApplied: string[];
  applicationsSent: string[];
  recruitersContacted: string[];
  rejectedCompanies: string[];
  offers: string[];
  favoriteCoverLetterStyle: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string;
  resumeFileName?: string;
  linkedIn?: string;
  portfolio?: string;
  gitHub?: string;

  // New Rich Career Hub Fields
  avatar?: string;
  currentRole?: string;
  yearsOfExperience?: string;
  location?: string;
  availability?: string;
  preferredJobType?: string;
  atsScore?: number;
  aiConfidenceScore?: number;
  lastResumeAnalysis?: string;

  // Professional Profile (Source of Truth)
  careerStage?: string;
  studentOrGraduateOrProfessional?: "Student" | "Graduate" | "Professional";
  fresherOrExperienced?: "Fresher" | "Experienced";
  highestQualification?: string;
  primaryDomain?: string;
  
  resumes?: ResumeRecord[];
  
  // AI analysis auto-generated
  summary?: string;
  primaryTechStack?: string[];
  strongestSkills?: string[];
  weakAreas?: string[];
  recommendedSkills?: string[];
  careerLevel?: string;
  targetRoles?: string[];
  resumeQuality?: string;
  missingKeywords?: string[];

  // Grouped skills
  skillsGrouped?: SkillCategoryGroup;
  
  // Detailed items
  projects?: ProjectItem[];
  experienceTimeline?: ExperienceItem[];
  educationList?: EducationItem[];
  certifications?: string[];
  awards?: string[];
  languagesList?: string[];
  publications?: string[];

  // Preferences, Memory & Insights
  preferences?: CareerPreferences;
  aiMemory?: AiMemory;
  careerInsights?: string[];
}

export interface CoverLetterRecord {
  id: string;
  company: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface StorageSchema {
  applications: ApplicationRecord[];
  chatHistory: ChatMessage[];
  settings: AgentSettings;
  sidebarOpen: boolean;
  profile?: UserProfile;
  coverLetters?: CoverLetterRecord[];
  longTermMemory: LongTermMemory;
  executionLogs: ExecutionLogEntry[];
  agentMetrics: Record<string, AgentMetricRecord>;
  healthChecks: HealthCheckResult[];
  visualMemory?: any;
  apiKeys: ApiKeys;
  approvalState?: ApprovalState;
  activeWorkspaceMode?: string;
}

export const defaultStorage: StorageSchema = {
  applications: [],
  chatHistory: [],
  settings: {
    theme: "light",
    sidebarPinned: false,
    userName: "",
    developerMode: false,
    ollamaUrl: "http://localhost:11434",
    provider: "gemini",
    model: "",
    temperature: 0.6,
    maxTokens: 1024,
    fallbackProvider: "none",
    streaming: false,
    visionProvider: "none",
    embeddingProvider: "none",
    maxSessionTokens: 50000,
    sidebarWidth: 560,
    sidebarHeight: 450
  },
  apiKeys: {
    apiKey: "",
    openaiApiKey: "",
    anthropicApiKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    deepseekApiKey: ""
  },
  sidebarOpen: false,
  profile: {
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
    yearsOfExperience: "",
    location: "",
    availability: "Available",
    preferredJobType: "Full-time",
    atsScore: 0,
    aiConfidenceScore: 0,
    lastResumeAnalysis: "",
    resumes: [],
    summary: "",
    primaryTechStack: [],
    strongestSkills: [],
    weakAreas: [],
    recommendedSkills: [],
    careerLevel: "Mid-level",
    targetRoles: [],
    resumeQuality: "N/A",
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
  },
  coverLetters: [],
  longTermMemory: {
    userPreferences: {},
    favoriteCompanies: [],
    successfulApplications: [],
    savedJobs: [],
    generatedCoverLetters: [],
    updatedAt: new Date(0).toISOString()
  },
  executionLogs: [],
  agentMetrics: {},
  healthChecks: [],
  visualMemory: { interactions: [], layouts: [] },
  activeWorkspaceMode: "general"
};
