import type { ActionType, ExecutionPlan } from "../shared/types/agent";
import { type CopilotTask } from "./TaskScheduler";

export const WorkflowPlanner = {
  /**
   * Plans workflows dynamically based on structured plans
   */
  plan(executionPlan: ExecutionPlan): CopilotTask[] {
    const tasks: CopilotTask[] = [];

    // Helper to generate task objects
    const createTask = (action: ActionType, name: string, description?: string): CopilotTask => ({
      id: crypto.randomUUID(),
      name,
      action,
      status: "pending",
      attempts: 0,
      description: description || name
    });

    const goal = executionPlan.goal;

    if (goal === "apply_job") {
      tasks.push(createTask("extract_job", "Read Job", "Extracting role details and description"));
      tasks.push(createTask("research_company", "Research Company", "Extracting organization insights and culture"));
      tasks.push(createTask("match_resume", "Analyze Skills", "Evaluating profile skills gap analysis"));
      tasks.push(createTask("generate_cover_letter", "Generate Cover Letter", "Drafting tailored cover letter draft"));
      tasks.push(createTask("click_element", "Find Apply Button", "Locating and clicking the application button on the page"));
      tasks.push(createTask("fill_form", "Fills Application", "Mapping inputs and populating field values"));
      tasks.push(createTask("upload_resume", "Upload Resume", "Highlighting file selectors for resume manual uploads"));
      tasks.push(createTask("click_element", "Submit Application", "Submitting the final job application form"));
    } else if (goal === "research_company") {
      tasks.push(createTask("research_company", "Research Company", "Synthesizing professional company insights"));
    } else if (goal === "analyze_job_match") {
      tasks.push(createTask("extract_job", "Read Job", "Reading job requirements"));
      tasks.push(createTask("match_resume", "Compare Resume", "Matching qualifications"));
    } else if (goal === "generate_cover_letter") {
      tasks.push(createTask("extract_job", "Read Job", "Extracting job details"));
      tasks.push(createTask("generate_cover_letter", "Generate Cover Letter", "Tailoring cover letter draft"));
    } else if (goal === "autofill_form") {
      tasks.push(createTask("fill_form", "Fill Form", "Scanning and autofilling inputs"));
    } else if (goal === "save_job") {
      tasks.push(createTask("extract_job", "Read Job", "Extracting job details"));
      tasks.push(createTask("save_job", "Save Job", "Persisting job details to tracker"));
    } else if (goal === "summarize_page") {
      tasks.push(createTask("extract_text", "Extract Page Text", "Reading raw text content"));
      tasks.push(createTask("chat_fallback", "Summarize Content", "Generating summary description"));
    } else {
      // Map other actions sequentially
      executionPlan.actions.forEach((act) => {
        tasks.push(createTask(act, act.replace(/_/g, " ")));
      });
    }

    return tasks;
  }
};
