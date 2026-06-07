import type { ChatMessage, ThemeMode } from "./messages";

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
}

export const defaultStorage: StorageSchema = {
  applications: [],
  chatHistory: [],
  settings: {
    theme: "system",
    sidebarPinned: false,
    userName: "",
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
  coverLetters: []
};
