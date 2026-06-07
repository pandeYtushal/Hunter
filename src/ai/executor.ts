import { JobAgent } from "../agents/JobAgent";
import { ResumeAgent } from "../agents/ResumeAgent";
import { FormAgent } from "../agents/FormAgent";
import { ResearchAgent } from "../agents/ResearchAgent";
import { NavigationAgent } from "../agents/NavigationAgent";
import type { ExecutionPlan, ExecutionStep, AgentState, AgentType, ActionType } from "../shared/types/agent";
import { storage } from "../shared/storage";
import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import { robustJsonParse } from "../shared/json";

const resolveClickTarget = async (goal: string, pageContext?: PageSnapshot): Promise<{ selector: string; text?: string }> => {
  const prompt = `You are a browser automation agent. The user's goal is to: "${goal}".
Here is the webpage context:
Title: ${pageContext?.title}
Url: ${pageContext?.url}
Content excerpt:
${pageContext?.content?.slice(0, 4000) || "No content"}

Identify the single most likely CSS selector and optional inner text of the HTML button or link to click.
Return a clean, valid JSON block. Do not include markdown code blocks, comments, or explanations:
{
  "selector": "CSS selector (e.g., 'button.apply-btn', 'a.next-page', 'input[type=submit]')",
  "text": "The inner text of the element if relevant (or null)"
}`;

  try {
    const reply = await generateAiReply({ prompt, history: [], pageContext });
    const parsed = robustJsonParse(reply);
    return {
      selector: parsed.selector || "button, a",
      text: parsed.text || undefined
    };
  } catch (err) {
    console.warn("Failed to resolve click target using AI, falling back to defaults:", err);
    return { selector: "button, a" };
  }
};

const resolveFillTarget = async (goal: string, pageContext?: PageSnapshot): Promise<{ selector: string; value: string }> => {
  const prompt = `You are a browser automation agent. The user's goal is to: "${goal}".
Here is the webpage context:
Title: ${pageContext?.title}
Url: ${pageContext?.url}
Content excerpt:
${pageContext?.content?.slice(0, 4000) || "No content"}

Identify the single most likely CSS selector of the input field to populate and the value to put in it.
Return a clean, valid JSON block. Do not include markdown code blocks, comments, or explanations:
{
  "selector": "CSS selector of input/textarea (e.g., 'input[name=first-name]', 'textarea#cover-letter')",
  "value": "The string value to fill in the input"
}`;

  try {
    const reply = await generateAiReply({ prompt, history: [], pageContext });
    const parsed = robustJsonParse(reply);
    return {
      selector: parsed.selector || "input",
      value: parsed.value || "Test"
    };
  } catch (err) {
    console.warn("Failed to resolve fill target using AI, falling back to defaults:", err);
    return { selector: "input", value: "Test" };
  }
};

export async function executePlan(
  plan: ExecutionPlan,
  steps: ExecutionStep[],
  onProgress: (state: Partial<AgentState>) => void
): Promise<AgentState> {
  const errors: string[] = [];
  let currentResult = "";
  
  let extractedJob: any = null;
  let matchAnalysis: any = null;
  let coverLetterRecord: any = null;
  let formAutofillReport: any = null;

  for (let i = 0; i < steps.length; i++) {
    // Check if execution was cancelled by user
    const currentState = await chrome.storage.local.get("agentState");
    if (currentState?.agentState && !currentState.agentState.isActive) {
      errors.push("Execution cancelled by user.");
      break;
    }

    const step = steps[i];
    step.status = "running";
    
    const currentAgent = getAgentForAction(step.action);
    
    onProgress({
      currentAgent,
      currentStep: `Running step ${step.step}: ${step.description}...`,
      progress: Math.round((i / steps.length) * 85) + 10,
      steps
    });

    const retries = 3;
    let attempt = 0;
    let success = false;
    let stepError = "";

    while (attempt < retries && !success) {
      try {
        attempt++;
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        let pageContext: any = undefined;
        if (tab?.id) {
          const res = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_SNAPSHOT" }).catch(() => undefined);
          pageContext = res?.snapshot;
        }

        const profile = await storage.get("profile");
        if (!profile) {
          throw new Error("Resume profile not found. Please set up your profile and upload a resume first.");
        }

        switch (step.action) {
          case "extract_job": {
            if (!pageContext) throw new Error("Web page details are not accessible.");
            extractedJob = await JobAgent.extractJob(pageContext);
            currentResult = JSON.stringify(extractedJob);
            break;
          }
          case "match_resume": {
            if (!pageContext) throw new Error("Web page details are not accessible.");
            const targetJob = extractedJob || { title: pageContext.title, company: "Unknown", skills: [], experience: "" };
            matchAnalysis = await ResumeAgent.matchResume(targetJob, profile);
            currentResult = JSON.stringify(matchAnalysis);
            break;
          }
          case "generate_cover_letter": {
            if (!pageContext) throw new Error("Web page details are not accessible.");
            const targetJob = extractedJob || { title: pageContext.title, company: "Unknown", skills: [], experience: "" };
            coverLetterRecord = await JobAgent.generateCoverLetter(targetJob, profile);
            currentResult = JSON.stringify(coverLetterRecord);
            break;
          }
          case "fill_form": {
            if (!tab?.id) throw new Error("Active tab connection was lost.");
            const autofillRes = await FormAgent.scanAndMap(tab.id, profile);
            formAutofillReport = autofillRes;
            currentResult = JSON.stringify({
              type: "autofill_confirmation",
              ...autofillRes
            });
            break;
          }
          case "research_company": {
            const companyName = extractedJob?.company || pageContext?.title.split("-")[0].split("|")[0].trim() || "Employer";
            const research = await ResearchAgent.researchCompany(companyName, pageContext);
            currentResult = JSON.stringify({
              type: "research_result",
              company: companyName,
              overview: research.overview,
              products: research.products,
              recommendations: research.recommendations
            });
            break;
          }
          case "parse_resume": {
            currentResult = "To parse your resume, open profile settings to upload.";
            break;
          }
          case "click_element": {
            if (!tab?.id) throw new Error("Active tab connection was lost.");
            const target = await resolveClickTarget(plan.goal, pageContext);
            await NavigationAgent.click(tab.id, target.selector, target.text);
            currentResult = `Clicked element matching "${target.selector}"${target.text ? ` containing "${target.text}"` : ""}.`;
            break;
          }
          case "fill_input": {
            if (!tab?.id) throw new Error("Active tab connection was lost.");
            const target = await resolveFillTarget(plan.goal, pageContext);
            await NavigationAgent.fill(tab.id, target.selector, target.value);
            currentResult = `Filled input matching "${target.selector}" with value: "${target.value}".`;
            break;
          }
          case "extract_text": {
            if (!tab?.id) throw new Error("Active tab connection was lost.");
            const text = await NavigationAgent.extract(tab.id);
            currentResult = text.slice(0, 500);
            break;
          }
          case "navigate_page": {
            if (!tab?.id) throw new Error("Active tab connection was lost.");
            await NavigationAgent.navigate(tab.id, tab.url || "");
            currentResult = "Performed browser page navigation.";
            break;
          }
          case "upload_resume": {
            if (!tab?.id) throw new Error("Active tab connection was lost.");
            await NavigationAgent.highlightUpload(tab.id);
            currentResult = "Highlighted resume file upload inputs.";
            break;
          }
          case "chat_fallback":
          default: {
            const chatRes = await chrome.runtime.sendMessage({
              type: "SEND_CHAT_MESSAGE",
              prompt: plan.goal
            });
            currentResult = chatRes?.message?.content || "Command processed.";
            break;
          }
        }

        success = true;
        step.status = "completed";
      } catch (err) {
        stepError = err instanceof Error ? err.message : "Step processing failed.";
        console.warn(`Step ${step.step} (${step.action}) attempt ${attempt} failed:`, stepError);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!success) {
      step.status = "failed";
      step.error = stepError;
      errors.push(`Step ${step.step} (${step.action}) failed: ${stepError}`);
    }

    onProgress({ steps, errors });
  }

  let finalResult = currentResult;
  if (plan.goal === "apply_job") {
    finalResult = JSON.stringify({
      type: "orchestration_result",
      summary: `Autonomous application flow steps finalized for: ${extractedJob?.title || "job"} at ${extractedJob?.company || "company"}.`,
      job: extractedJob,
      match: matchAnalysis,
      coverLetter: coverLetterRecord,
      autofill: formAutofillReport,
      errors: errors.length > 0 ? errors : undefined
    });
  }

  return {
    isActive: false,
    goal: plan.goal,
    currentAgent: "Unknown",
    currentStep: errors.length > 0 ? "Execution finished with errors." : "All actions completed successfully!",
    progress: 100,
    steps,
    errors,
    finalResult
  };
}

function getAgentForAction(action: ActionType): AgentType {
  switch (action) {
    case "extract_job":
      return "JobAgent";
    case "match_resume":
      return "ResumeAgent";
    case "generate_cover_letter":
      return "JobAgent";
    case "fill_form":
      return "FormAgent";
    case "research_company":
      return "ResearchAgent";
    case "parse_resume":
      return "ResumeAgent";
    case "click_element":
    case "fill_input":
    case "extract_text":
    case "navigate_page":
    case "upload_resume":
      return "NavigationAgent";
    default:
      return "Unknown";
  }
}
