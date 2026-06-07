import type { ChatMessage, PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { storage } from "../shared/storage";

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

export interface GenerateAiReplyInput {
  prompt: string;
  history: ChatMessage[];
  pageContext?: PageSnapshot;
  profile?: UserProfile;
}

const geminiModel = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || "gemini-2.5-flash";
const openaiModel = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || "gpt-4o-mini";
const anthropicModel = (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) || "claude-3-5-sonnet-20241022";
const groqModel = (import.meta.env.VITE_GROQ_MODEL as string | undefined) || "llama-3.3-70b-versatile";

const buildSystemContext = (pageContext?: PageSnapshot, profile?: UserProfile) => {
  const pageLines = pageContext
    ? [
        `Current page title: ${pageContext.title || "Unknown"}`,
        `Current page URL: ${pageContext.url || "Unknown"}`,
        `Current page host: ${pageContext.host || "Unknown"}`,
        `Selected text or page description: ${
          pageContext.selectedText || pageContext.description || "No page context captured."
        }`,
        pageContext.content ? `Webpage content:\n${pageContext.content}` : "",
        pageContext.metadata ? `Webpage metadata:\n${JSON.stringify(pageContext.metadata)}` : ""
      ].filter(Boolean)
    : ["No page context captured."];

  const profileLines = profile && (profile.name || profile.email || profile.skills.length > 0 || profile.experience)
    ? [
        `User Profile context:`,
        `- Name: ${profile.name || "Unknown"}`,
        `- Email: ${profile.email || "Unknown"}`,
        `- Phone: ${profile.phone || "Unknown"}`,
        `- Skills: ${profile.skills.join(", ") || "None listed"}`,
        `- Experience: ${profile.experience || "None listed"}`
      ]
    : [];

  return [
    "You are HUNTERR, a concise assistant for job searching, resume tailoring, and application preparation.",
    "Use the page context and the user's resume/profile details to answer queries or tailor materials when requested.",
    ...profileLines,
    ...pageLines
  ].join("\n");
};

const callGemini = async (key: string, systemInstruction: string, history: ChatMessage[], prompt: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
  
  const mapHistoryToGemini = (history: ChatMessage[]): GeminiContent[] =>
    history.slice(-10).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [...mapHistoryToGemini(history), { role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 900
      }
    })
  });

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || `Gemini request failed with status ${response.status}.`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
};

const callOpenAI = async (key: string, systemInstruction: string, history: ChatMessage[], prompt: string): Promise<string> => {
  const endpoint = "https://api.openai.com/v1/chat/completions";

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-10).map((msg) => ({
      role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: msg.content
    })),
    { role: "user", content: prompt }
  ];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: openaiModel,
      messages,
      temperature: 0.6,
      max_tokens: 900
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed with status ${response.status}.`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }
  return text;
};

const callAnthropic = async (key: string, systemInstruction: string, history: ChatMessage[], prompt: string): Promise<string> => {
  const endpoint = "https://api.anthropic.com/v1/messages";

  const messages = history.slice(-10).map((msg) => ({
    role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: msg.content
  }));
  messages.push({ role: "user", content: prompt });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: anthropicModel,
      system: systemInstruction,
      messages,
      max_tokens: 1024,
      temperature: 0.6
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Anthropic request failed with status ${response.status}.`);
  }

  const text = data.content?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }
  return text;
};

const callGroq = async (key: string, systemInstruction: string, history: ChatMessage[], prompt: string): Promise<string> => {
  const endpoint = "https://api.groq.com/openai/v1/chat/completions";

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-10).map((msg) => ({
      role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: msg.content
    })),
    { role: "user", content: prompt }
  ];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: groqModel,
      messages,
      temperature: 0.6,
      max_tokens: 900
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Groq request failed with status ${response.status}.`);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Groq returned an empty response.");
  }
  return text;
};

export const generateAiReply = async ({
  prompt,
  history,
  pageContext,
  profile
}: GenerateAiReplyInput): Promise<string> => {
  let settings: any = null;
  try {
    settings = await storage.get("settings");
  } catch (err) {
    console.error("Failed to read settings from storage:", err);
  }

  const provider = settings?.provider || "gemini";
  const systemInstruction = buildSystemContext(pageContext, profile);

  switch (provider) {
    case "openai": {
      const key = settings?.openaiApiKey?.trim();
      if (!key) {
        throw new Error("Missing OpenAI API key. Configure it in the HUNTERR settings panel.");
      }
      return callOpenAI(key, systemInstruction, history, prompt);
    }
    case "anthropic": {
      const key = settings?.anthropicApiKey?.trim();
      if (!key) {
        throw new Error("Missing Anthropic Claude API key. Configure it in the HUNTERR settings panel.");
      }
      return callAnthropic(key, systemInstruction, history, prompt);
    }
    case "groq": {
      const key = settings?.groqApiKey?.trim();
      if (!key) {
        throw new Error("Missing Groq API key. Configure it in the HUNTERR settings panel.");
      }
      return callGroq(key, systemInstruction, history, prompt);
    }
    case "gemini":
    default: {
      const key = settings?.apiKey?.trim();
      if (!key) {
        throw new Error("Missing Gemini API key. Configure it in the HUNTERR settings panel.");
      }
      return callGemini(key, systemInstruction, history, prompt);
    }
  }
};

// Backwards-compatibility alias
export const generateGeminiReply = generateAiReply;
