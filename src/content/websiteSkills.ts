export type WebsiteSkillName = "LinkedInSkill" | "GmailSkill" | "GitHubSkill" | "IndeedSkill" | "LeetCodeSkill" | "StackOverflowSkill" | "NotionSkill";

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
    const path = window.location.pathname;
    
    // 1. Profile Extraction
    const isProfile = path.startsWith("/in/") || path.includes("/profile/");
    const profileName = text("h1");
    const headline = text(".text-body-medium, .pv-text-details__left-panel .text-body-medium, [data-generated-suggestion-target='headline']");
    const about = text("#about ~ div .display-flex, #about ~ div .pv-shared-text-with-see-more");
    
    const experienceContainers = Array.from(document.querySelectorAll("#experience ~ div ul.pvs-list > li"));
    const experience = experienceContainers.map(container => (container as HTMLElement).innerText?.replace(/\s+/g, " ").trim()).filter(Boolean);

    // 2. Job details
    const isJobPage = path.startsWith("/jobs/");
    const jobTitle = text(".jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title, h1.t-24");
    const company = text(".jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__primary-description a");
    const location = text(".jobs-unified-top-card__bullet, .jobs-unified-top-card__primary-description span:nth-of-type(1)");
    const jobDescription = text("#job-details, .jobs-description__content, .jobs-box__html-content");

    // 3. Messaging details
    const isMessaging = path.startsWith("/messaging/");
    const activeChatPartner = text(".msg-entity-lockup__entity-title, .msg-thread__link .truncate");
    const visibleMessages = listText(".msg-s-message-list__event, .msg-s-message-group-body", 15);

    // 4. Notifications details
    const isNotifications = path.startsWith("/notifications/");
    const notificationList = listText(".nt-card, .nt-card__title", 10);

    // 5. Feed details (Posts)
    const posts = listText(".feed-shared-update-v2, .update-components-text, .feed-shared-update-v2__description", 5);

    return {
      skill: "LinkedInSkill",
      confidence: jobTitle || profileName || activeChatPartner ? 0.92 : 0.6,
      summary: isProfile
        ? `LinkedIn profile: "${profileName}" - ${headline.slice(0, 50)}`
        : isJobPage
        ? `LinkedIn Job page: "${jobTitle}" at ${company}`
        : isMessaging
        ? `LinkedIn Messages with: ${activeChatPartner}`
        : isNotifications
        ? `LinkedIn Notifications Page`
        : `LinkedIn Feed / Page`,
      data: {
        isProfile,
        isJobPage,
        isMessaging,
        isNotifications,
        profile: {
          name: profileName,
          headline,
          about,
          experience
        },
        job: {
          title: jobTitle,
          company,
          location,
          description: jobDescription.slice(0, 5000)
        },
        messaging: {
          chatPartner: activeChatPartner,
          messages: visibleMessages
        },
        notifications: {
          items: notificationList
        },
        feed: {
          posts
        }
      }
    };
  }
};

const GmailSkill: WebsiteSkill = {
  name: "GmailSkill",
  matches: (host) => host.includes("mail.google.com"),
  extract: () => {
    const isInbox = window.location.hash.includes("#inbox") || window.location.hash === "" || window.location.hash === "#all";
    const subject = text("h2.hP, [data-legacy-message-id] h2, .ha h2");
    
    const messageContainers = Array.from(document.querySelectorAll(".adn.iv, .adn"));
    const messages = messageContainers.map((container) => {
      const senderName = container.querySelector(".gD")?.getAttribute("name") || container.querySelector(".gD")?.textContent?.trim() || "";
      const senderEmail = container.querySelector(".gD")?.getAttribute("email") || "";
      
      const recipientElems = Array.from(container.querySelectorAll(".hb [email], .iv [email], .g2 [email]"));
      const recipients = recipientElems.map(el => ({
        name: el.getAttribute("name") || el.textContent?.trim() || "",
        email: el.getAttribute("email") || ""
      })).filter(r => r.email && r.email !== senderEmail);
      
      const timestamp = container.querySelector(".g3")?.getAttribute("title") || container.querySelector(".g3")?.textContent?.trim() || "";
      const body = (container.querySelector(".a3s.aiL, .ii.gt") as HTMLElement | null)?.innerText?.replace(/\s+/g, " ").trim() || "";
      
      const attachmentElems = Array.from(container.querySelectorAll(".aoy, .aQJ, [role='listitem'] a[href*='disp=inline']"));
      const attachments = attachmentElems.map(el => ({
        name: el.textContent?.trim() || el.getAttribute("title") || "Attachment",
        url: el.getAttribute("href") || ""
      }));

      return {
        sender: { name: senderName, email: senderEmail },
        recipients,
        timestamp,
        body: body.slice(0, 5000),
        attachments
      };
    }).filter(msg => msg.sender.email || msg.body);

    const hasOpenEmail = messages.length > 0;

    return {
      skill: "GmailSkill",
      confidence: hasOpenEmail ? 0.95 : (isInbox ? 0.75 : 0.3),
      summary: hasOpenEmail 
        ? `Gmail open email thread: "${subject}" (${messages.length} messages)`
        : `Gmail inbox view`,
      data: {
        isInbox,
        subject,
        messages,
        replyChainCount: messages.length,
        latestEmail: messages[messages.length - 1] || null
      }
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

const NotionSkill: WebsiteSkill = {
  name: "NotionSkill",
  matches: (host) => host.includes("notion.so"),
  extract: () => {
    const pageTitle = text(".notion-page-controls ~ h1, [placeholder='Untitled'], .notion-peek-renderer [contenteditable='true']");
    const blocks = listText(".notion-selectable, [data-block-id]", 30);

    return {
      skill: "NotionSkill",
      confidence: pageTitle || blocks.length ? 0.88 : 0.4,
      summary: pageTitle ? `Notion Page: "${pageTitle}"` : "Notion page or workspace",
      data: {
        pageTitle,
        contentExcerpt: blocks.join("\n").slice(0, 8000),
        blocksCount: blocks.length
      }
    };
  }
};

const skills: WebsiteSkill[] = [LinkedInSkill, GmailSkill, GitHubSkill, IndeedSkill, LeetCodeSkill, StackOverflowSkill, NotionSkill];

export function extractWebsiteSkillData(host = window.location.host): WebsiteSkillResult | undefined {
  const skill = skills.find((candidate) => candidate.matches(host));
  if (!skill) return undefined;

  try {
    return skill.extract();
  } catch {
    return undefined;
  }
}
