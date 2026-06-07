import { generateAiReply } from "./aiService";
import { IntentClassifier } from "./intentClassifier";
import type { ExecutionPlan, AgentType, ActionType, IntentClassification, IntentType, PlanGoal } from "../shared/types/agent";
import { robustJsonParse } from "../shared/json";

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
    "chat_fallback"
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

  if (classification.intent === "CHAT_FALLBACK") {
    return fallbackPlan;
  }

  const prompt = `You are a cognitive planning agent for an Autonomous Browser Job Search Assistant.
The user's intent has already been classified deterministically as "${classification.intent}".
Your task is to refine the execution plan without changing the user-facing feature or inventing unsupported actions.

Supported Goals:
- "apply_job": Run the full application cycle (extract job details, match resume, generate cover letter, scan/fill form).
- "summarize_page": Extract raw text and summarize the active page context.
- "research_company": Synthesize professional information about the employer.
- "save_job": Extract job details and add them to application tracking storage.
- "generate_cover_letter": Generate a tailored cover letter draft.
- "autofill_form": Detect and prepare autofill mappings on page inputs.
- "analyze_job_match": Compare user profile skills against job requirements.

Available Agents:
- "JobAgent"
- "ResumeAgent"
- "FormAgent"
- "ResearchAgent"
- "NavigationAgent"
- "Unknown"

Available Actions:
- "extract_job": Read page HTML to extract structured job info.
- "match_resume": Synthesize resume skills alignment and match score.
- "generate_cover_letter": Generate tailored cover letter text.
- "fill_form": Run heuristic and FormAgent matches to populate input fields.
- "research_company": Pull company summary, culture, and interview prep tips.
- "save_job": Persist extracted job details into application tracking storage.
- "parse_resume": Extract candidate profile from resume text.
- "click_element": Click a specific link, button, or tab.
- "fill_input": Set the value of an input field.
- "extract_text": Extract clean raw page text.
- "navigate_page": Go to a target URL or section.
- "upload_resume": Highlight file inputs for resume manual uploads.
- "chat_fallback": General fallback chat answer.

Instructions:
- Start from this deterministic plan: ${JSON.stringify(fallbackPlan)}.
- Keep actions in a safe execution order and only remove an action when it is clearly unnecessary.
- If the user wants to save or track a job, include actions ["extract_job", "save_job"].
- If the user wants to match resume or check alignment, include actions ["extract_job", "match_resume"].
- If the user wants a cover letter, include actions ["extract_job", "generate_cover_letter"].
- If the user wants to fill a form ("fill application form", "autofill form", "scan form"), return goal "autofill_form", agents ["FormAgent"], and actions ["fill_form"].
- If the user wants to summarize the page ("summarize page", "what is this page about"), return goal "summarize_page", agents ["JobAgent"], and actions ["extract_text", "chat_fallback"].

User Command: "${userPrompt}"

Return a clean, valid JSON object with the following keys. Do not include markdown code fences or comments, just the raw JSON:
{
  "goal": "apply_job",
  "agents": ["JobAgent", "ResumeAgent", ...],
  "actions": ["extract_job", "match_resume", ...]
}`;

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
