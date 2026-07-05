import { generateAiReply } from "./aiService";
import { IntentClassifier } from "./intentClassifier";
import type { ExecutionPlan, AgentType, ActionType, IntentClassification, IntentType, PlanGoal } from "../shared/types/agent";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

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
    "chat_fallback"
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
  const classification = IntentClassifier.classify(userPrompt);
  const fallbackPlan = deterministicPlan(classification);

  if (classification.intent === "CHAT_FALLBACK" || classification.intent === "SUMMARIZE_PAGE") {
    return fallbackPlan;
  }

  const prompt = PromptManager.getPlannerPrompt(userPrompt, fallbackPlan);

  const responseText = await generateAiReply({
    prompt,
    history: []
  });

  try {
    const parsed = robustJsonParse<Partial<ExecutionPlan>>(responseText);
    return sanitizePlan(parsed, fallbackPlan);
  } catch (error) {
    console.error("Failed to parse Planner response as JSON:", responseText, error);
    return fallbackPlan;
  }
};
