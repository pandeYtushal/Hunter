import { generateAiReply } from "./aiService";
import type { ExecutionPlan, AgentType, ActionType } from "../shared/types/agent";
import { robustJsonParse } from "../shared/json";

export const planUserGoal = async (userPrompt: string): Promise<ExecutionPlan> => {
  const prompt = `You are a cognitive planning agent for an Autonomous Browser Job Search Assistant.
Your task is to analyze the user's natural language goal and map it to one of the supported goals, list the specialized agents required, and define the sequence of actions to be executed.

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
- "parse_resume": Extract candidate profile from resume text.
- "click_element": Click a specific link, button, or tab.
- "fill_input": Set the value of an input field.
- "extract_text": Extract clean raw page text.
- "navigate_page": Go to a target URL or section.
- "upload_resume": Highlight file inputs for resume manual uploads.
- "chat_fallback": General fallback chat answer.

Instructions:
- If the user wants to apply for a job ("apply for this job", "start application", "autofill and submit"), return goal "apply_job", agents ["JobAgent", "ResumeAgent", "FormAgent"], and actions ["extract_job", "match_resume", "generate_cover_letter", "fill_form"].
- If the user wants to research a company ("research this company", "tell me about google", "who is the employer"), return goal "research_company", agents ["ResearchAgent"], and actions ["research_company"].
- If the user wants to save or track a job ("save this job", "track this posting"), return goal "save_job", agents ["JobAgent"], and actions ["extract_job"].
- If the user wants to match resume or check alignment ("analyze this job", "am I a good fit", "check match score"), return goal "analyze_job_match", agents ["ResumeAgent"], and actions ["match_resume"].
- If the user wants a cover letter ("generate cover letter", "write cover letter"), return goal "generate_cover_letter", agents ["JobAgent"], and actions ["generate_cover_letter"].
- If the user wants to fill a form ("fill application form", "autofill form", "scan form"), return goal "autofill_form", agents ["FormAgent"], and actions ["fill_form"].
- If the user wants to summarize the page ("summarize page", "what is this page about"), return goal "summarize_page", agents ["JobAgent"], and actions ["extract_text", "chat_fallback"].
- Otherwise, return goal "chat_fallback", agents ["Unknown"], and actions ["chat_fallback"].

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
    return {
      goal: parsed.goal || "chat_fallback",
      agents: Array.isArray(parsed.agents) ? (parsed.agents as AgentType[]) : ["Unknown"],
      actions: Array.isArray(parsed.actions) ? (parsed.actions as ActionType[]) : ["chat_fallback"]
    };
  } catch (error) {
    console.error("Failed to parse Planner response as JSON:", responseText, error);
    return {
      goal: "chat_fallback",
      agents: ["Unknown"],
      actions: ["chat_fallback"]
    };
  }
};
