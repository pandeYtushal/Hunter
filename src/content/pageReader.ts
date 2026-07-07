import { extractWebsiteSkillData } from "./websiteSkills";

export function extractTitle(): string {
  return document.title || "";
}

export function extractMetadata(): Record<string, string> {
  const metadata: Record<string, string> = {};

  const description =
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ||
    "";
  if (description) {
    metadata.description = description;
  }

  const keywords =
    document.querySelector<HTMLMetaElement>('meta[name="keywords"]')?.content ||
    "";
  if (keywords) {
    metadata.keywords = keywords;
  }

  const ogTitle =
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ||
    "";
  if (ogTitle) {
    metadata.ogTitle = ogTitle;
  }

  const ogUrl =
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content ||
    "";
  if (ogUrl) {
    metadata.ogUrl = ogUrl;
  }

  return metadata;
}

export function extractPageContent(): string {
  const body = document.body;
  if (!body) {
    return "";
  }

  // Clone the body to avoid modifying the visual page state
  const clone = body.cloneNode(true) as HTMLElement;

  // List of selectors representing noise that doesn't contain useful textual content
  const noisySelectors = [
    "script",
    "style",
    "noscript",
    "iframe",
    "svg",
    "canvas",
    "nav",
    "footer",
    "header",
    "dialog",
    "form",
    "button",
    "select",
    "option",
    "input",
    "textarea",
    ".nav",
    ".header",
    ".footer",
    "#header",
    "#footer"
  ];

  noisySelectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((element) => {
      element.remove();
    });
  });

  // Extract remaining visible text
  const text = clone.innerText || clone.textContent || "";

  // Normalize spaces and line endings
  const finalContent = text
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  // Truncate to a reasonable limit (15,000 chars is ~3,500 tokens) 
  // to avoid hitting API token quotas on extremely large pages.
  return finalContent.length > 15000 ? finalContent.substring(0, 15000) + "\n...[Content truncated for length]..." : finalContent;
}

export function extractStructuredPageData() {
  return extractWebsiteSkillData();
}
