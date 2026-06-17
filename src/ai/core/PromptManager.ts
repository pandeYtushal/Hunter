import type { PageSnapshot } from "../../shared/types/messages";
import type { UserProfile } from "../../shared/types/storage";
import type { ActionType, ExecutionPlan } from "../../shared/types/agent";
import type { VisualElement } from "../../vision/VisionTypes";

export class PromptManager {
  /**
   * System instruction builder (formerly buildSystemContext in aiService)
   */
  static getSystemInstruction(pageContext?: PageSnapshot, profile?: UserProfile): string {
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
  }

  /**
   * Core planner prompt (formerly in planner.ts)
   */
  static getPlannerPrompt(userPrompt: string, fallbackPlan: ExecutionPlan): string {
    return `You are a cognitive planning agent for an Autonomous Browser Job Search Assistant.
The user's intent has already been classified deterministically as "${fallbackPlan.intent?.intent}".
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
  }

  /**
   * Replanner prompt (formerly in replanner.ts)
   */
  static getReplannerPrompt(
    goal: string,
    currentPlanActions: ActionType[],
    completedActions: ActionType[],
    failedAction: ActionType,
    failureReason: string,
    memoryContext?: string
  ): string {
    return `You are a cognitive planning agent for an Autonomous Browser Job Search Assistant.
The user's goal is: "${goal}"
Current Plan: ${JSON.stringify(currentPlanActions)}
Completed Steps: ${JSON.stringify(completedActions)}
Failed Action: "${failedAction}"
Failure Reason: "${failureReason}"
${memoryContext ? `Execution History Memory context:\n${memoryContext}` : ""}

Analyze this failure and generate a revised action list. Do not get stuck in a failure loop. If an action is blocked, you can use general webpage interaction fallback actions (like click_element, navigate_page, extract_text, fill_input) or skip unnecessary steps.

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

Return a clean, valid JSON block specifying the new remaining action list to execute. Do not include comments or markdown fences:
{
  "newActions": ["action_1", "action_2", ...],
  "explanation": "Brief reasoning explaining how this plan recovers from the failure"
}`;
  }

  /**
   * Core cognitive reasoning prompt (formerly in reasoningEngine.ts)
   */
  static getReasoningPrompt(contextString: string, lowDomWarningNotice: string): string {
    return `You are the core Cognitive Reasoning Brain for HUNTERR, an autonomous job search browser assistant.
Your task is to analyze the current goal, active webpage, user profile, and execution history, and determine the next best action.
${lowDomWarningNotice}

${contextString}

Instructions:
1. Examine the goal and what has been done so far.
2. Determine if the goal is fully accomplished, requires a tool, or is blocked.
3. Select the most appropriate tool from "Available Tools" to move closer to the goal.
4. Output your decision as a clean, valid JSON block. Do not include markdown code fences, comments, or explanations, just the raw JSON:

{
  "reasoning": "Explain step-by-step why you selected this action and how it relates to the goal.",
  "selectedTool": "Name of the tool (must match one of the available tool names exactly, e.g., 'extract_job', 'match_resume', 'fill_form', 'vision_click', 'vision_fill', 'chat_fallback')",
  "confidence": 0.85,
  "status": "continue"
}`;
  }

  /**
   * Action Evaluator prompt (formerly in actionEvaluator.ts)
   */
  static getActionEvaluatorPrompt(action: ActionType, result: string, pageContext?: PageSnapshot): string {
    return `You are an AI Action Evaluator for Hunter, an autonomous browser agent.
Action performed: "${action}"
Resulting Output: "${result.slice(0, 1500)}"

Webpage Title: "${pageContext?.title || "Unknown"}"
Webpage URL: "${pageContext?.url || "Unknown"}"
Webpage Excerpt:
${pageContext?.content?.slice(0, 3000) || "No snapshot available"}

Evaluate whether the action accomplished its goal. For form-filling actions, check if essential inputs were populated. For navigation or element interaction, verify the interaction succeeded.
Return a clean, valid JSON block. Do not include comments or markdown fences:
{
  "success": true,
  "confidence": 0.9,
  "issues": [],
  "recommendations": []
}`;
  }

  /**
   * Job Details Extractor prompt (formerly in jobAgent.ts)
   */
  static getJobExtractPrompt(): string {
    return `You are a structured data extraction agent. Extract the job details from the current page content and metadata.
Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "title": "Job Title (or 'Unknown')",
  "company": "Company Name (or 'Unknown')",
  "location": "Location (or 'Unknown')",
  "salary": "Salary or Compensation info (or 'Unknown')",
  "experience": "Required experience level or years (or 'Unknown')",
  "skills": ["Skill 1", "Skill 2", ...] (an array of required skills or technologies)
}`;
  }

  /**
   * Resume Parser prompt (formerly in resumeAgent.ts)
   */
  static getResumeParsePrompt(resumeText: string): string {
    return `You are an expert resume parser agent. Parse the following resume text and extract the requested fields.
Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "name": "Candidate Name (or 'Unknown')",
  "email": "Email Address (or 'Unknown')",
  "phone": "Phone Number (or 'Unknown')",
  "linkedIn": "LinkedIn URL if found (or 'Unknown')",
  "portfolio": "Portfolio or personal website URL if found (or 'Unknown')",
  "skills": ["Skill 1", "Skill 2", ...] (an array of skills/technologies),
  "experience": "A clear description/summary of work history (or 'Unknown')"
}

Parsing rules:
- The candidate name is usually near the top. Do not use a job title, section heading, email, phone number, or URL as the name.
- Put only linkedin.com profile URLs in "linkedIn".
- Put only a personal website or portfolio domain in "portfolio".
- Do not put GitHub, Twitter/X, Instagram, Facebook, LeetCode, HackerRank, Kaggle, Medium, or Dev.to URLs in "portfolio".
- Extract skills from explicit Skills/Technical Skills/Technologies sections first, then infer additional technologies from projects and work experience.
- Keep skill names concise and deduplicated.

Resume Text:
${resumeText}`;
  }

  /**
   * Company Research prompt (formerly in researchAgent.ts)
   */
  static getResearchCompanyPrompt(companyName: string): string {
    return `You are a professional company research agent. Research the company "${companyName}".
Using the provided page context if relevant (or your general knowledge), synthesize key professional insights about this company.
Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "companyOverview": "Brief overview of what the company does, its industry, scale, etc.",
  "keyProducts": "Core products, services, or divisions of the company.",
  "companyCulture": "Description of the public culture, core values, or work environment.",
  "interviewTips": "Helpful tips for interview prep, focus areas, or commonly assessed criteria at this company."
}`;
  }

  /**
   * Match fit score prompt (formerly in matchAgent.ts)
   */
  static getMatchAnalysisPrompt(profile: UserProfile, pageContext: PageSnapshot): string {
    return `You are an expert career coaching agent. Compare the user's profile/resume details with the job description page context.
Perform a semantic comparison of skills and experience. Calculate a match score between 0 and 100 based on how well the candidate matches the job requirements.
List matched skills, missing skills, and provide specific, actionable coaching recommendations on how to bridge any gaps.

User Profile:
- Name: ${profile.name || "Unknown"}
- Skills: ${profile.skills.join(", ") || "None listed"}
- Experience: ${profile.experience || "None listed"}

Job Page Context:
- Title: ${pageContext.title}
- Content: ${pageContext.content || "No page content available"}
- Description: ${pageContext.description || "No description available"}

Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "matchScore": number (0 to 100),
  "matchedSkills": ["Skill 1", "Skill 2", ...],
  "missingSkills": ["Skill A", "Skill B", ...],
  "recommendations": "Actionable coaching recommendations for the candidate."
}`;
  }

  /**
   * Form analysis prompt (formerly in formAgent.ts)
   */
  static getFormFieldsAnalysisPrompt(formHtmlExcerpt: string): string {
    return `You are a form analysis agent. Analyze the following HTML forms or serialized input fields from a job application.
Map each field to one of these standard profile fields:
- "name" (Full Name)
- "firstName" (First Name)
- "lastName" (Last Name)
- "email" (Email Address)
- "phone" (Phone Number)
- "linkedin" (LinkedIn Profile URL)
- "portfolio" (Portfolio or Personal Website URL)
- "resume" (Resume or CV File Upload input)
- "unknown" (Any other unrelated or general fields)

Form Inputs Data:
${formHtmlExcerpt}

Return a clean, valid JSON array of objects with the following keys. Do not include markdown code fences or comments, just the raw JSON:
[
  { "fieldId": "element-id-or-name", "mappedType": "email" },
  ...
]`;
  }

  /**
   * Tailored Cover Letter prompt (formerly in coverLetterAgent.ts)
   */
  static getCoverLetterPrompt(profile: UserProfile, pageContext: PageSnapshot): string {
    return `You are an expert career coaching agent. Write a professional, concise, and highly tailored cover letter for the candidate applying to the job page context.
Use the candidate's name, email, phone, skills, and work experience from their profile, and align them with the job requirements. Keep it professional and follow standard cover letter structures (salutations, opening pitch, alignment body, closing call to action, and formal signature).

User Profile:
- Name: ${profile.name || "Candidate"}
- Email: ${profile.email || ""}
- Phone: ${profile.phone || ""}
- Skills: ${profile.skills.join(", ") || ""}
- Experience: ${profile.experience || ""}

Job Context:
- Title/Role: ${pageContext.title}
- Company/Host: ${pageContext.host || "the Company"}
- Page Content: ${pageContext.content || ""}

Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "company": "Company Name",
  "role": "Job Role / Title",
  "coverLetter": "Complete letter body text including contact header, subject, date, salutations, body paragraphs, and sign-off."
}`;
  }

  /**
   * Screen screenshot elements extraction prompt (formerly in VisionService.ts)
   */
  static getVisionAnalyzePrompt(goal: string): string {
    return `Analyze this webpage screenshot to help accomplish the user's goal: "${goal}".
Detect visible user interface elements including:
- Buttons (type: "button", actions: ["click"])
- Inputs (type: "input", actions: ["focus", "fill"])
- Forms (type: "form")
- Dropdowns (type: "dropdown", actions: ["click"])
- Checkboxes (type: "checkbox", actions: ["click"])
- Dialogs (type: "dialog")
- Upload Areas (type: "upload_area", actions: ["click"])
- Navigation links/items (type: "navigation", actions: ["click"])
- Important Sections (type: "section")
- Call To Action buttons (type: "cta", actions: ["click"])

For each element, you MUST return:
1. id: unique string identifier
2. type: element type from the list above
3. text: label, visible text, or placeholder
4. bounds: normalized bounding box {"ymin": ymin, "xmin": xmin, "ymax": ymax, "xmax": xmax} from 0 to 1000 relative to the image size. ymin is top, xmin is left, ymax is bottom, xmax is right.
5. confidence: prediction confidence score between 0.0 and 1.0
6. importance: "high", "medium", or "low"
7. actions: array of actions, e.g. ["click"]

You must respond with a raw JSON block matching this schema (do not wrap in markdown or markdown code fences):
{
  "reasoning": "Brief overview of what is visible on this screen and the general layout relative to the goal.",
  "confidence": 0.95,
  "elements": [
    {
      "id": "el-1",
      "type": "cta",
      "text": "Apply Now",
      "bounds": {"ymin": 350, "xmin": 400, "ymax": 395, "xmax": 600},
      "confidence": 0.98,
      "importance": "high",
      "actions": ["click"]
    }
  ]
}`;
  }

  /**
   * Selector Click Resolution prompt (formerly in toolRegistry.ts)
   */
  static getResolveClickTargetPrompt(goal: string, pageContext?: PageSnapshot): string {
    return `You are a browser automation agent. The user's goal is to: "${goal}".
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
  }

  /**
   * Selector Fill Resolution prompt (formerly in toolRegistry.ts)
   */
  static getResolveFillTargetPrompt(goal: string, pageContext?: PageSnapshot): string {
    return `You are a browser automation agent. The user's goal is to: "${goal}".
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
  }

  /**
   * Visual Click Resolution prompt (formerly in toolRegistry.ts)
   */
  static getResolveVisualClickTargetPrompt(goal: string, elements: VisualElement[]): string {
    return `Based on the goal: "${goal}", select the single best visual element from this list to click:
${JSON.stringify(elements.map(el => ({ id: el.id, text: el.text, type: el.type, bounds: el.bounds })))}

Return your answer strictly as a JSON object:
{
  "id": "selected-element-id"
}`;
  }

  /**
   * Visual Fill Resolution prompt (formerly in toolRegistry.ts)
   */
  static getResolveVisualFillTargetPrompt(goal: string, elements: VisualElement[], profile: UserProfile): string {
    return `Based on the goal: "${goal}" and candidate profile:
Name: ${profile.name}
Email: ${profile.email}
Experience: ${profile.experience}

Select the single best visual element input from this list to fill and determine the value to fill:
${JSON.stringify(elements.filter(el => el.type === "input").map(el => ({ id: el.id, text: el.text })))}

Return your answer strictly as a JSON object:
{
  "id": "selected-element-id",
  "value": "value to fill"
}`;
  }
}
