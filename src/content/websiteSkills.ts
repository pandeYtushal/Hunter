export type WebsiteSkillName = "LinkedInSkill" | "GmailSkill" | "GitHubSkill" | "IndeedSkill" | "LeetCodeSkill" | "StackOverflowSkill";

export interface WebsiteSkillResult {
  skill: WebsiteSkillName;
  confidence: number;
  summary: string;
  data: Record<string, unknown>;
}

export interface WebsiteSkill {
  name: WebsiteSkillName;
  matches(host: string): boolean;
  extract(): WebsiteSkillResult;
}

const text = (selector: string): string =>
  document.querySelector<HTMLElement>(selector)?.innerText?.replace(/\s+/g, " ").trim() || "";

const listText = (selector: string, limit = 8): string[] =>
  Array.from(document.querySelectorAll<HTMLElement>(selector))
    .map((element) => element.innerText.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, limit);

const LinkedInSkill: WebsiteSkill = {
  name: "LinkedInSkill",
  matches: (host) => host.includes("linkedin.com"),
  extract: () => {
    const profileName = text("h1");
    const headline = text(".text-body-medium, .pv-text-details__left-panel .text-body-medium");
    const jobTitle = text(".jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title");
    const company = text(".jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name");
    const posts = listText(".feed-shared-update-v2, .update-components-text", 3);

    return {
      skill: "LinkedInSkill",
      confidence: jobTitle || profileName ? 0.86 : 0.58,
      summary: jobTitle ? `LinkedIn job: ${jobTitle}${company ? ` at ${company}` : ""}` : `LinkedIn profile or feed: ${profileName || "active page"}`,
      data: { profileName, headline, jobTitle, company, posts }
    };
  }
};

const GmailSkill: WebsiteSkill = {
  name: "GmailSkill",
  matches: (host) => host.includes("mail.google.com"),
  extract: () => {
    const subject = text("h2.hP, [data-legacy-message-id] h2");
    const sender = text(".gD, [email][name]");
    const visibleMessages = listText(".a3s.aiL, .ii.gt", 5);

    return {
      skill: "GmailSkill",
      confidence: subject || visibleMessages.length ? 0.84 : 0.52,
      summary: subject ? `Gmail conversation: ${subject}` : "Gmail inbox or conversation",
      data: { subject, sender, visibleMessages }
    };
  }
};

const GitHubSkill: WebsiteSkill = {
  name: "GitHubSkill",
  matches: (host) => host.includes("github.com"),
  extract: () => {
    const repo = text("strong[itemprop='name'] a, [data-pjax='#repo-content-pjax-container'] strong a");
    const issueTitle = text("bdi.js-issue-title, .js-issue-title");
    const readme = text("article.markdown-body");

    return {
      skill: "GitHubSkill",
      confidence: repo || issueTitle ? 0.88 : 0.58,
      summary: issueTitle ? `GitHub issue: ${issueTitle}` : `GitHub repository: ${repo || document.title}`,
      data: { repo, issueTitle, readmeExcerpt: readme.slice(0, 1800) }
    };
  }
};

const IndeedSkill: WebsiteSkill = {
  name: "IndeedSkill",
  matches: (host) => host.includes("indeed."),
  extract: () => {
    const title = text("[data-testid='jobsearch-JobInfoHeader-title'], h1");
    const company = text("[data-testid='inlineHeader-companyName'], [data-company-name='true']");
    const location = text("[data-testid='job-location'], #jobLocationText");
    const description = text("#jobDescriptionText");

    return {
      skill: "IndeedSkill",
      confidence: title || description ? 0.87 : 0.55,
      summary: `Indeed job: ${title || document.title}`,
      data: { title, company, location, description }
    };
  }
};

const LeetCodeSkill: WebsiteSkill = {
  name: "LeetCodeSkill",
  matches: (host) => host.includes("leetcode.com"),
  extract: () => {
    const title = text("[data-cy='question-title'], .mr-2.text-label-1, h1");
    const difficulty = text("[diff], .text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard");
    const prompt = text("[data-track-load='description_content'], .elfjS");

    return {
      skill: "LeetCodeSkill",
      confidence: title || prompt ? 0.82 : 0.5,
      summary: `LeetCode problem: ${title || document.title}`,
      data: { title, difficulty, prompt }
    };
  }
};

const StackOverflowSkill: WebsiteSkill = {
  name: "StackOverflowSkill",
  matches: (host) => host.includes("stackoverflow.com"),
  extract: () => {
    const question = text("#question-header h1, h1[itemprop='name']");
    const acceptedAnswer = text(".answer.accepted-answer .s-prose, .answer.js-accepted-answer .s-prose");
    const tags = listText(".post-tag", 12);

    return {
      skill: "StackOverflowSkill",
      confidence: question ? 0.86 : 0.54,
      summary: `Stack Overflow question: ${question || document.title}`,
      data: { question, acceptedAnswer, tags }
    };
  }
};

const skills: WebsiteSkill[] = [LinkedInSkill, GmailSkill, GitHubSkill, IndeedSkill, LeetCodeSkill, StackOverflowSkill];

export function extractWebsiteSkillData(host = window.location.host): WebsiteSkillResult | undefined {
  const skill = skills.find((candidate) => candidate.matches(host));
  if (!skill) return undefined;

  try {
    return skill.extract();
  } catch {
    return undefined;
  }
}
