import { FormAgent } from "../agents/FormAgent";
import { JobAgent } from "../agents/JobAgent";
import { NavigationAgent } from "../agents/NavigationAgent";
import { ResearchAgent } from "../agents/ResearchAgent";
import { ResumeAgent } from "../agents/ResumeAgent";
import { MessageBus } from "../core/MessageBus";
import { storage } from "../shared/storage";
import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import type { ActionType } from "../types/Action";
import type { AgentType } from "../types/Agent";
import type { ExecutionContext } from "../types/Execution";
import { requestCache } from "./cache";
import { generateAiReply } from "./aiService";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";
import { longTermMemory } from "./longTermMemory";
import { VisionAgent } from "../vision/VisionAgent";
import { VisionService } from "../vision/VisionService";
import { VisualActionEngine } from "../vision/VisualActionEngine";
import type { VisualElement } from "../vision/VisionTypes";


export interface ToolRuntime {
  tab?: chrome.tabs.Tab;
  pageContext?: PageSnapshot;
  profile?: UserProfile;
}

export interface ToolResult {
  result: string;
  waitingConfirmation?: boolean;
}

export type ToolHandler = (runtime: ToolRuntime, context: ExecutionContext) => Promise<ToolResult>;

export interface ToolDefinition {
  action: ActionType;
  agent: AgentType;
  description: string;
  requiresProfile: boolean;
  handler: ToolHandler;
}

const pageHash = (pageContext?: PageSnapshot): string =>
  `${pageContext?.url ?? ""}:${pageContext?.title ?? ""}:${(pageContext?.content ?? "").length}`;

const fallbackJob = (pageContext?: PageSnapshot) => ({
  title: pageContext?.title || "Unknown",
  company: "Unknown",
  location: "Unknown",
  salary: "Unknown",
  experience: "",
  skills: [],
  matchScore: 50
});

const resolveClickTarget = async (goal: string, pageContext?: PageSnapshot): Promise<{ selector: string; text?: string }> => {
  const prompt = PromptManager.getResolveClickTargetPrompt(goal, pageContext);

  const reply = await generateAiReply({ prompt, history: [], pageContext });
  const parsed = robustJsonParse<{ selector?: string; text?: string | null }>(reply);
  return {
    selector: parsed.selector || "button, a",
    text: parsed.text || undefined
  };
};

const resolveFillTarget = async (goal: string, pageContext?: PageSnapshot): Promise<{ selector: string; value: string }> => {
  const prompt = PromptManager.getResolveFillTargetPrompt(goal, pageContext);

  const reply = await generateAiReply({ prompt, history: [], pageContext });
  const parsed = robustJsonParse<{ selector?: string; value?: string }>(reply);
  return {
    selector: parsed.selector || "input",
    value: parsed.value || ""
  };
};

const resolveVisualClickTarget = async (goal: string, elements: VisualElement[]): Promise<VisualElement> => {
  const prompt = PromptManager.getResolveVisualClickTargetPrompt(goal, elements);

  const reply = await generateAiReply({ prompt, history: [] });
  const parsed = robustJsonParse<{ id?: string }>(reply);
  const matched = elements.find(el => el.id === parsed.id);
  if (!matched) {
    const fallback = elements.find(el => el.type === "button" || el.type === "cta" || el.type === "navigation");
    if (!fallback) {
      throw new Error(`Failed to match visual element for goal: ${goal}`);
    }
    return fallback;
  }
  return matched;
};

const resolveVisualFillTarget = async (goal: string, elements: VisualElement[], profile: UserProfile): Promise<{ element: VisualElement; value: string }> => {
  const prompt = PromptManager.getResolveVisualFillTargetPrompt(goal, elements, profile);

  const reply = await generateAiReply({ prompt, history: [] });
  const parsed = robustJsonParse<{ id?: string; value?: string }>(reply);
  const matched = elements.find(el => el.id === parsed.id);
  if (!matched) {
    const fallback = elements.find(el => el.type === "input");
    if (!fallback) {
      throw new Error(`Failed to match visual element input for goal: ${goal}`);
    }
    return { element: fallback, value: profile.name || "" };
  }
  return { element: matched, value: parsed.value || "" };
};

const requirePageContext = (pageContext?: PageSnapshot): PageSnapshot => {
  if (!pageContext) throw new Error("Web page details are not accessible.");
  return pageContext;
};

const requireTabId = (tab?: chrome.tabs.Tab): number => {
  if (!tab?.id) throw new Error("Active tab connection was lost.");
  return tab.id;
};

const requireProfile = (profile?: UserProfile): UserProfile => {
  if (!profile) {
    throw new Error("Resume profile not found. Please set up your profile and upload a resume first.");
  }
  return profile;
};

const createRegistry = (): Map<ActionType, ToolDefinition> => {
  const tools: ToolDefinition[] = [
    {
      action: "extract_job",
      agent: "JobAgent",
      description: "Extracting job description details",
      requiresProfile: false,
      handler: async ({ pageContext }, context) => {
        const snapshot = requirePageContext(pageContext);
        const extracted = await requestCache.getOrSet(
          `extract_job:${pageHash(snapshot)}`,
          () => JobAgent.extractJob(snapshot),
          180000
        );
        context.extractedJob = extracted;
        await MessageBus.send("JobAgent", "ResumeAgent", "JOB_EXTRACTED", extracted);
        return { result: JSON.stringify(extracted) };
      }
    },
    {
      action: "match_resume",
      agent: "ResumeAgent",
      description: "Comparing resume qualifications against requirements",
      requiresProfile: true,
      handler: async ({ pageContext, profile }, context) => {
        const snapshot = requirePageContext(pageContext);
        const userProfile = requireProfile(profile);
        const targetJob = context.extractedJob || fallbackJob(snapshot);
        const match = await requestCache.getOrSet(
          `match_resume:${pageHash(snapshot)}:${userProfile.skills.join("|")}`,
          () => ResumeAgent.matchResume(targetJob, userProfile),
          180000
        );
        context.matchAnalysis = match;
        await MessageBus.send("ResumeAgent", "FormAgent", "RESUME_MATCHED", match);
        return { result: JSON.stringify(match) };
      }
    },
    {
      action: "generate_cover_letter",
      agent: "JobAgent",
      description: "Generating tailored cover letter draft",
      requiresProfile: true,
      handler: async ({ pageContext, profile }, context) => {
        const snapshot = requirePageContext(pageContext);
        const userProfile = requireProfile(profile);
        const targetJob = context.extractedJob || fallbackJob(snapshot);
        const record = await requestCache.getOrSet(
          `cover_letter:${pageHash(snapshot)}:${userProfile.name}:${userProfile.email}`,
          () => JobAgent.generateCoverLetter(targetJob, userProfile),
          180000
        );
        context.coverLetterRecord = record;
        await storage.set("coverLetters", [record, ...((await storage.get("coverLetters")) ?? [])].slice(0, 50));
        await longTermMemory.updateMemory((memory) => ({
          ...memory,
          generatedCoverLetters: [record, ...memory.generatedCoverLetters]
        }));
        await MessageBus.send("JobAgent", "FormAgent", "COVER_LETTER_GENERATED", record);
        return { result: JSON.stringify(record) };
      }
    },
    {
      action: "fill_form",
      agent: "FormAgent",
      description: "Scanning and mapping webpage forms",
      requiresProfile: true,
      handler: async ({ tab, profile }, context) => {
        const report = await FormAgent.scanAndMap(requireTabId(tab), requireProfile(profile));
        context.formAutofillReport = report;
        await MessageBus.send("FormAgent", "Unknown", "FORM_READY", report);
        return {
          result: JSON.stringify({
            type: "autofill_confirmation",
            ...report
          }),
          waitingConfirmation: true
        };
      }
    },
    {
      action: "research_company",
      agent: "ResearchAgent",
      description: "Synthesizing company overview and culture insights",
      requiresProfile: false,
      handler: async ({ pageContext }, context) => {
        const companyName = context.extractedJob?.company || pageContext?.title.split("-")[0].split("|")[0].trim() || "Employer";
        const research = await requestCache.getOrSet(
          `research_company:${companyName}:${pageHash(pageContext)}`,
          () => ResearchAgent.researchCompany(companyName, pageContext),
          300000
        );
        await MessageBus.send("ResearchAgent", "JobAgent", "RESEARCH_COMPLETED", research);
        return {
          result: JSON.stringify({
            type: "research_result",
            company: companyName,
            overview: research.overview,
            products: research.products,
            recommendations: research.recommendations
          })
        };
      }
    },
    {
      action: "save_job",
      agent: "JobAgent",
      description: "Saving job to application tracker",
      requiresProfile: false,
      handler: async ({ pageContext }, context) => {
        const job = context.extractedJob || fallbackJob(pageContext);
        const applications = await storage.get("applications");
        const exists = applications.some(
          (app) => app.company.toLowerCase() === job.company.toLowerCase() && app.role.toLowerCase() === job.title.toLowerCase()
        );
        const next = exists
          ? applications
          : [
              {
                id: crypto.randomUUID(),
                company: job.company,
                role: job.title,
                sourceUrl: pageContext?.url || "",
                status: "saved" as const,
                createdAt: new Date().toISOString()
              },
              ...applications
            ];

        await storage.set("applications", next);
        await longTermMemory.updateMemory((memory) => ({
          ...memory,
          savedJobs: [job.company && job.title ? `${job.company} - ${job.title}` : job.title, ...memory.savedJobs],
          favoriteCompanies: job.company && job.company !== "Unknown" ? [job.company, ...memory.favoriteCompanies] : memory.favoriteCompanies
        }));
        return { result: JSON.stringify(job) };
      }
    },
    {
      action: "parse_resume",
      agent: "ResumeAgent",
      description: "Extracting candidate profile from resume PDF",
      requiresProfile: false,
      handler: async () => ({ result: "To parse your resume, open profile settings to upload." })
    },
    {
      action: "click_element",
      agent: "NavigationAgent",
      description: "Performing element click on webpage",
      requiresProfile: false,
      handler: async ({ tab, pageContext }, context) => {
        const target: { selector: string; text?: string } = await resolveClickTarget(context.plan.goal, pageContext).catch(() => ({ selector: "button, a" }));
        await NavigationAgent.click(requireTabId(tab), target.selector, target.text);
        return { result: `Clicked element matching "${target.selector}"${target.text ? ` containing "${target.text}"` : ""}.` };
      }
    },
    {
      action: "fill_input",
      agent: "NavigationAgent",
      description: "Populating input value on form field",
      requiresProfile: false,
      handler: async ({ tab, pageContext }, context) => {
        const target = await resolveFillTarget(context.plan.goal, pageContext).catch(() => ({ selector: "input", value: "" }));
        await NavigationAgent.fill(requireTabId(tab), target.selector, target.value);
        return { result: `Filled input matching "${target.selector}".` };
      }
    },
    {
      action: "extract_text",
      agent: "NavigationAgent",
      description: "Extracting raw text from active webpage",
      requiresProfile: false,
      handler: async ({ tab }) => {
        const text = await NavigationAgent.extract(requireTabId(tab));
        return { result: text.slice(0, 500) };
      }
    },
    {
      action: "navigate_page",
      agent: "NavigationAgent",
      description: "Navigating page sections or URLs",
      requiresProfile: false,
      handler: async ({ tab }) => {
        await NavigationAgent.navigate(requireTabId(tab), tab?.url || "");
        return { result: "Performed browser page navigation." };
      }
    },
    {
      action: "upload_resume",
      agent: "NavigationAgent",
      description: "Locating and highlighting file inputs for resume manual uploads",
      requiresProfile: false,
      handler: async ({ tab }) => {
        await NavigationAgent.highlightUpload(requireTabId(tab));
        return { result: "Highlighted resume file upload inputs." };
      }
    },
    {
      action: "vision_click",
      agent: "VisionAgent",
      description: "Clicking element using visual coordinates",
      requiresProfile: false,
      handler: async ({ tab, pageContext }, context) => {
        const tabId = requireTabId(tab);
        const url = pageContext?.url || "";
        const analysis = await VisionService.analyzePage(tabId, context.plan.goal);
        
        const targetElement = await resolveVisualClickTarget(context.plan.goal, analysis.elements);
        await chrome.storage.local.set({ lastVisionTarget: targetElement.text }).catch(() => null);
        
        await VisualActionEngine.clickByVision(tabId, targetElement, url);
        return { result: `Visually clicked element "${targetElement.text}" with confidence ${targetElement.confidence}` };
      }
    },
    {
      action: "vision_fill",
      agent: "VisionAgent",
      description: "Filling input using visual coordinates",
      requiresProfile: true,
      handler: async ({ tab, pageContext, profile }, context) => {
        const tabId = requireTabId(tab);
        const url = pageContext?.url || "";
        const userProfile = requireProfile(profile);
        const analysis = await VisionService.analyzePage(tabId, context.plan.goal);

        const { element, value } = await resolveVisualFillTarget(context.plan.goal, analysis.elements, userProfile);
        await chrome.storage.local.set({ lastVisionTarget: element.text }).catch(() => null);

        await VisionAgent.locateAndFill(tabId, element.text, value, context.plan.goal, url);
        return { result: `Visually filled input "${element.text}" with value.` };
      }
    },
    {
      action: "vision_analyze",
      agent: "VisionAgent",
      description: "Analyzing page visually",
      requiresProfile: false,
      handler: async ({ tab }, context) => {
        const tabId = requireTabId(tab);
        const analysis = await VisionService.analyzePage(tabId, context.plan.goal);
        return { result: `Visually analyzed page: detected ${analysis.elements.length} elements. Reasoning: ${analysis.reasoning}` };
      }
    },
    {
      action: "chat_fallback",
      agent: "Unknown",
      description: "Generating fallback general conversational response",
      requiresProfile: false,
      handler: async ({ pageContext, profile }, context) => {
        const prompt =
          context.plan.goal === "summarize_page"
            ? "Summarize the active page clearly and concisely for a job seeker."
            : "Respond to the user's request using the current page context.";
        const result = await generateAiReply({
          prompt,
          history: [],
          pageContext,
          profile
        });
        return { result };
      }
    }
  ];

  return new Map(tools.map((tool) => [tool.action, tool]));
};

export const ToolRegistry = {
  tools: createRegistry(),

  get(action: ActionType): ToolDefinition {
    const tool = ToolRegistry.tools.get(action);
    if (!tool) {
      throw new Error(`No tool registered for action "${action}".`);
    }
    return tool;
  },

  list(): ToolDefinition[] {
    return Array.from(ToolRegistry.tools.values());
  }
};
