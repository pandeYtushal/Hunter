import { generateAiReply } from "./aiService";
import { IntentClassifier } from "./intentClassifier";
import type { ExecutionPlan, AgentType, ActionType, IntentClassification, IntentType, PlanGoal } from "../shared/types/agent";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

export type UserIntentType =
  | "NAVIGATE"
  | "CLICK"
  | "SCROLL"
  | "TYPE"
  | "EDIT"
  | "SEARCH"
  | "READ"
  | "OBSERVE"
  | "RESEARCH"
  | "WORKFLOW"
  | "VISION"
  | "FORM"
  | "UPLOAD"
  | "DOWNLOAD"
  | "COMPARE"
  | "CHAT";

export const routeIntent = (query: string): UserIntentType => {
  const q = query.trim().toLowerCase();

  // Exclude educational/chat inquiries first to force CHAT
  if (
    q.startsWith("explain") ||
    q.startsWith("how to") ||
    q.startsWith("how do i") ||
    q.startsWith("what is") ||
    q.startsWith("why did") ||
    q.startsWith("summarize") ||
    q.includes("help me understand") ||
    q.includes("review my resume") ||
    q.includes("review resume")
  ) {
    return "CHAT";
  }

  // WORKFLOW
  if (q.includes("apply") || q.includes("job application") || q.includes("submit application")) {
    return "WORKFLOW";
  }

  // FORM / AUTOFILL
  if (q.includes("autofill") || q.includes("fill form") || q.includes("scan form")) {
    return "FORM";
  }

  // NAVIGATE
  if (
    q.startsWith("go to") ||
    q.startsWith("open") ||
    q.startsWith("navigate") ||
    q.startsWith("visit") ||
    q.includes("redirect")
  ) {
    return "NAVIGATE";
  }

  // CLICK
  if (
    q.startsWith("click") ||
    q.startsWith("press") ||
    q.startsWith("select") ||
    q.startsWith("toggle") ||
    q.startsWith("choose") ||
    q.startsWith("expand")
  ) {
    return "CLICK";
  }

  // SCROLL
  if (q.startsWith("scroll") || q.includes("scroll down") || q.includes("scroll up") || q.startsWith("move page")) {
    return "SCROLL";
  }

  // TYPE / EDIT
  if (q.startsWith("replace") || q.startsWith("type") || q.startsWith("write") || q.startsWith("fill") || q.startsWith("enter")) {
    return "TYPE";
  }
  if (q.startsWith("edit") || q.startsWith("change") || q.startsWith("update") || q.startsWith("set")) {
    return "EDIT";
  }

  // SEARCH
  if (q.startsWith("search") || q.startsWith("lookup") || q.startsWith("find")) {
    return "SEARCH";
  }

  // UPLOAD
  if (q.includes("upload") || q.includes("attach")) {
    return "UPLOAD";
  }

  // DOWNLOAD
  if (q.includes("download") || q.includes("save file")) {
    return "DOWNLOAD";
  }

  // COMPARE
  if (q.includes("compare") || q.includes("match resume") || q.includes("evaluate skills")) {
    return "COMPARE";
  }

  // VISION
  if (q.includes("visual click") || q.includes("vision click") || q.includes("visually")) {
    return "VISION";
  }

  // READ / OBSERVE
  if (q.includes("read latest email") || q.includes("read email") || q.includes("get email")) {
    return "READ";
  }
  if (q.includes("read page") || q.includes("extract text") || q.includes("read profile")) {
    return "READ";
  }
  if (q.startsWith("read") || q.startsWith("observe") || q.startsWith("look at") || q.startsWith("check")) {
    return "OBSERVE";
  }

  // RESEARCH
  if (q.includes("research") || q.includes("company profile")) {
    return "RESEARCH";
  }

  // Conversational questions fallback
  if (q.includes("?") || q.startsWith("explain") || q.startsWith("tell me") || q.startsWith("what") || q.startsWith("how")) {
    return "CHAT";
  }

  return "CHAT";
};

export const shouldActQuery = (query: string): boolean => {
  const intent = routeIntent(query);
  return [
    "CLICK",
    "NAVIGATE",
    "SCROLL",
    "TYPE",
    "EDIT",
    "SEARCH",
    "UPLOAD",
    "DOWNLOAD",
    "FORM",
    "COMPARE",
    "WORKFLOW",
    "VISION",
    "READ",
    "OBSERVE"
  ].includes(intent);
};

const deterministicPlan = (classification: IntentClassification): ExecutionPlan => {
  const map: Record<IntentType, ExecutionPlan> = {
    APPLY_JOB: {
      goal: "apply_job",
      agents: ["JobAgent", "ResumeAgent", "FormAgent"],
      actions: ["extract_job", "match_resume", "generate_cover_letter", "fill_form"]
    },
    ANALYZE_JOB: {
      goal: "analyze_job_match",
      agents: ["JobAgent", "ResumeAgent"],
      actions: ["extract_job", "match_resume"]
    },
    RESEARCH_COMPANY: {
      goal: "research_company",
      agents: ["ResearchAgent"],
      actions: ["research_company"]
    },
    GENERATE_COVER_LETTER: {
      goal: "generate_cover_letter",
      agents: ["JobAgent"],
      actions: ["extract_job", "generate_cover_letter"]
    },
    FILL_FORM: {
      goal: "autofill_form",
      agents: ["FormAgent"],
      actions: ["fill_form"]
    },
    SAVE_JOB: {
      goal: "save_job",
      agents: ["JobAgent"],
      actions: ["extract_job", "save_job"]
    },
    SUMMARIZE_PAGE: {
      goal: "summarize_page",
      agents: ["JobAgent"],
      actions: ["extract_text", "chat_fallback"]
    },
    CHAT_FALLBACK: {
      goal: "chat_fallback",
      agents: ["Unknown"],
      actions: ["chat_fallback"]
    }
  };

  return {
    ...map[classification.intent],
    intent: classification
  };
};

const sanitizePlan = (parsed: Partial<ExecutionPlan>, fallback: ExecutionPlan): ExecutionPlan => {
  const validGoals: PlanGoal[] = [
    "apply_job",
    "analyze_job_match",
    "research_company",
    "generate_cover_letter",
    "autofill_form",
    "save_job",
    "summarize_page",
    "chat_fallback",
    "navigate",
    "click",
    "scroll",
    "type",
    "edit",
    "search",
    "upload",
    "download",
    "read",
    "observe"
  ];
  const validActions = new Set<ActionType>([
    "extract_job",
    "match_resume",
    "generate_cover_letter",
    "fill_form",
    "research_company",
    "save_job",
    "parse_resume",
    "click_element",
    "fill_input",
    "extract_text",
    "navigate_page",
    "upload_resume",
    "chat_fallback",
    "scroll_page",
    "download_file",
    "handle_modal",
    "handle_pagination",
    "handle_dynamic_form"
  ]);
  const validAgents = new Set<AgentType>(["JobAgent", "ResumeAgent", "FormAgent", "ResearchAgent", "NavigationAgent", "Unknown"]);

  const goal = parsed.goal && validGoals.includes(parsed.goal) ? parsed.goal : fallback.goal;
  const agents = Array.isArray(parsed.agents)
    ? parsed.agents.filter((agent): agent is AgentType => validAgents.has(agent as AgentType))
    : fallback.agents;
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.filter((action): action is ActionType => validActions.has(action as ActionType))
    : fallback.actions;

  return {
    goal,
    agents: agents.length > 0 ? agents : fallback.agents,
    actions: actions.length > 0 ? actions : fallback.actions,
    intent: fallback.intent
  };
};

export const planUserGoal = async (userPrompt: string): Promise<ExecutionPlan> => {
  const intent = routeIntent(userPrompt);

  const getDeterministicPlan = (): ExecutionPlan | null => {
    if (intent === "NAVIGATE") {
      return {
        goal: "navigate",
        agents: ["NavigationAgent"],
        actions: ["navigate_page"]
      };
    }
    if (intent === "CLICK") {
      return {
        goal: "click",
        agents: ["NavigationAgent"],
        actions: ["click_element"]
      };
    }
    if (intent === "SCROLL") {
      return {
        goal: "scroll",
        agents: ["NavigationAgent"],
        actions: ["scroll_page"]
      };
    }
    if (intent === "TYPE" || intent === "EDIT") {
      return {
        goal: "type",
        agents: ["NavigationAgent"],
        actions: ["fill_input"]
      };
    }
    if (intent === "SEARCH") {
      return {
        goal: "search",
        agents: ["NavigationAgent"],
        actions: ["navigate_page", "fill_input", "click_element"]
      };
    }
    if (intent === "UPLOAD") {
      return {
        goal: "upload",
        agents: ["NavigationAgent"],
        actions: ["upload_resume"]
      };
    }
    if (intent === "DOWNLOAD") {
      return {
        goal: "download",
        agents: ["NavigationAgent"],
        actions: ["download_file"]
      };
    }
    if (intent === "FORM") {
      return {
        goal: "autofill_form",
        agents: ["FormAgent"],
        actions: ["fill_form"]
      };
    }
    if (intent === "COMPARE") {
      return {
        goal: "analyze_job_match",
        agents: ["JobAgent", "ResumeAgent"],
        actions: ["extract_job", "match_resume"]
      };
    }
    return null;
  };

  const det = getDeterministicPlan();
  if (det) {
    const words = userPrompt.trim().split(/\s+/);
    if (words.length <= 2 && intent !== "CHAT") {
      return { ...det, query: userPrompt };
    }
  }

  const fallbackPlan = det || deterministicPlan(IntentClassifier.classify(userPrompt));

  if (!det && (fallbackPlan.intent?.intent === "CHAT_FALLBACK" || fallbackPlan.intent?.intent === "SUMMARIZE_PAGE")) {
    return { ...fallbackPlan, query: userPrompt };
  }

  const prompt = PromptManager.getPlannerPrompt(userPrompt, fallbackPlan);

  const responseText = await generateAiReply({
    prompt,
    history: []
  });

  try {
    const parsed = robustJsonParse<Partial<ExecutionPlan>>(responseText);
    const plan = sanitizePlan(parsed, fallbackPlan);
    return { ...plan, query: userPrompt };
  } catch (error) {
    console.error("Failed to parse Planner response as JSON:", responseText, error);
    return { ...fallbackPlan, query: userPrompt };
  }
};
