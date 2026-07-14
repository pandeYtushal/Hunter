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
      tasks.push(createTask("extract_job", "Read Job", "Reading current page..."));
      tasks.push(createTask("research_company", "Research Company", "Researching company insights..."));
      tasks.push(createTask("match_resume", "Analyze Skills", "Analyzing match score..."));
      tasks.push(createTask("generate_cover_letter", "Generate Cover Letter", "Drafting cover letter..."));
      tasks.push(createTask("click_element", "Find Apply Button", "Finding Apply button..."));
      tasks.push(createTask("fill_form", "Fills Application", "Understanding form..."));
      tasks.push(createTask("upload_resume", "Upload Resume", "Preparing resume upload..."));
      tasks.push(createTask("click_element", "Submit Application", "Submitting application..."));
    } else if (goal === "navigate") {
      tasks.push(createTask("navigate_page", "Navigate Page", "Reading current page..."));
    } else if (goal === "click") {
      tasks.push(createTask("click_element", "Click Element", "Finding and clicking element..."));
    } else if (goal === "scroll") {
      tasks.push(createTask("scroll_page", "Scroll Page", "Scrolling page viewport..."));
    } else if (goal === "type" || goal === "edit") {
      tasks.push(createTask("fill_input", "Fill Input", "Filling information..."));
    } else if (goal === "search") {
      tasks.push(createTask("navigate_page", "Open Search", "Navigating to search engine..."));
      tasks.push(createTask("fill_input", "Type Query", "Filling search inputs..."));
      tasks.push(createTask("click_element", "Click Search", "Executing search click..."));
    } else if (goal === "upload") {
      tasks.push(createTask("upload_resume", "Upload Resume", "Preparing resume upload..."));
    } else if (goal === "download") {
      tasks.push(createTask("download_file", "Download File", "Executing file download..."));
    } else if (goal === "research_company") {
      tasks.push(createTask("research_company", "Research Company", "Researching company insights..."));
    } else if (goal === "analyze_job_match") {
      tasks.push(createTask("extract_job", "Read Job", "Reading job requirements..."));
      tasks.push(createTask("match_resume", "Compare Resume", "Matching qualifications..."));
    } else if (goal === "generate_cover_letter") {
      tasks.push(createTask("extract_job", "Read Job", "Extracting job details..."));
      tasks.push(createTask("generate_cover_letter", "Generate Cover Letter", "Tailoring cover letter..."));
    } else if (goal === "autofill_form") {
      tasks.push(createTask("fill_form", "Fill Form", "Scanning and autofilling inputs..."));
    } else if (goal === "save_job") {
      tasks.push(createTask("extract_job", "Read Job", "Extracting job details..."));
      tasks.push(createTask("save_job", "Save Job", "Persisting job details to tracker..."));
    } else if (goal === "summarize_page") {
      tasks.push(createTask("extract_text", "Extract Page Text", "Reading raw text content..."));
      tasks.push(createTask("chat_fallback", "Summarize Content", "Generating summary description..."));
    } else {
      // Map other actions sequentially
      executionPlan.actions.forEach((act) => {
        tasks.push(createTask(act, act.replace(/_/g, " "), `Executing ${act.replace(/_/g, " ")}...`));
      });
    }

    return tasks;
  }
};
