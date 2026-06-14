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
  apiKey?: string; // Gemini
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  provider?: "gemini" | "openai" | "anthropic" | "groq";
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
}

export const defaultStorage: StorageSchema = {
  applications: [],
  chatHistory: [],
  settings: {
    theme: "system",
    sidebarPinned: false,
    userName: "",
    developerMode: false,
    apiKey: "",
    openaiApiKey: "",
    anthropicApiKey: "",
    groqApiKey: "",
    provider: "gemini"
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
    portfolio: ""
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
  visualMemory: { interactions: [], layouts: [] }
};
