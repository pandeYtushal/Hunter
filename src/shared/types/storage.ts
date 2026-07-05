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
    theme: "system",
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
    gitHub: ""
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
