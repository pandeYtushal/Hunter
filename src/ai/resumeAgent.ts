import { generateAiReply } from "./aiService";
import type { UserProfile } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

const KNOWN_SKILLS = [
  "Angular", "AWS", "Azure", "Bootstrap", "C", "C#", "C++", "CSS",
  "Data Analysis", "Deep Learning", "Django", "Docker", "Express",
  "FastAPI", "Firebase", "Flask", "GCP", "Git", "GitHub", "GraphQL",
  "HTML", "Java", "JavaScript", "Jest", "Kubernetes", "Machine Learning",
  "MongoDB", "MySQL", "Next.js", "Node.js", "PostgreSQL", "Python",
  "PyTorch", "React", "Redux", "REST", "SQL", "Tailwind", "TensorFlow",
  "TypeScript", "Vue", "Spring Boot", "Laravel", "Ruby on Rails", "Agile",
  "Scrum", "Figma", "Sass", "Webpack", "Vite", "Linux",
  "Data Structures", "Algorithms", "jQuery", "PHP", "Go", "Rust", "Kotlin", "Swift"
];

const SECTION_HEADINGS = [
  "summary",
  "objective",
  "education",
  "experience",
  "work experience",
  "employment",
  "projects",
  "skills",
  "technical skills",
  "certifications",
  "achievements",
  "languages",
  "interests"
];

const cleanUrl = (url: string) => url.replace(/[),.;\]]+$/, "");

const getUrlHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const getUrls = (text: string) =>
  Array.from(text.matchAll(/https?:\/\/[^\s),;\]]+/gi), (match) => cleanUrl(match[0]));

const isSocialUrl = (url: string) => {
  const host = getUrlHost(url);
  return [
    "linkedin.com",
    "github.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "instagram.com",
    "leetcode.com",
    "hackerrank.com",
    "codechef.com",
    "kaggle.com",
    "medium.com",
    "dev.to"
  ].some((domain) => host === domain || host.endsWith(`.${domain}`));
};

const extractNamedUrl = (lines: string[], labelPattern: RegExp) => {
  const line = lines.find((entry) => labelPattern.test(entry));
  return line ? getUrls(line)[0] || "" : "";
};

const isLikelyName = (line: string, email: string, phone: string) => {
  const normalized = line.replace(/[|•·]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 60) return false;
  if (email && normalized.includes(email)) return false;
  if (phone && normalized.includes(phone)) return false;
  if (/[0-9@:/\\]/.test(normalized)) return false;
  if (SECTION_HEADINGS.some((heading) => normalized.toLowerCase() === heading)) return false;
  if (/(resume|curriculum vitae|cv|developer|engineer|student|manager|designer|analyst)/i.test(normalized)) {
    return false;
  }

  const words = normalized.split(/\s+/);
  return words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word));
};

const extractSkills = (text: string, lines: string[]) => {
  const knownSkills = KNOWN_SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "i").test(text);
  });

  const skillLineIndex = lines.findIndex((line) => /^(technical\s+)?skills\b|technologies\b|tools\b/i.test(line));
  const sectionSkills: string[] = [];

  if (skillLineIndex >= 0) {
    const skillSectionLines = lines.slice(skillLineIndex, skillLineIndex + 8);
    const [, inlineAfterLabel = ""] = skillSectionLines[0].split(/:(.+)/);
    const sectionText = [inlineAfterLabel, ...skillSectionLines.slice(1)]
      .filter((line) => !SECTION_HEADINGS.some((heading) => line.toLowerCase() === heading))
      .join(", ");

    sectionText
      .split(/[,|;•·]+/)
      .map((item) => item.trim().replace(/^[-*]\s*/, ""))
      .filter((item) => {
        if (item.length < 2 || item.length > 30) return false;
        if (/^\d+$/.test(item)) return false;
        if (/\b(using|working|developed|built|managed|led|created|implemented|designing|developing|testing|strong|excellent|good|skills|knowledge|ability|history|experience)\b/i.test(item)) return false;
        if (item.split(/\s+/).length > 3) return false;
        return true;
      })
      .forEach((item) => sectionSkills.push(item));
  }

  return Array.from(new Set([...sectionSkills, ...knownSkills])).slice(0, 40);
};

const extractLocalResumeProfile = (resumeText: string): UserProfile => {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const compactText = lines.join("\n");

  const email = compactText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone =
    compactText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s+/g, " ").trim() || "";
  const urls = getUrls(compactText);
  const linkedIn = urls.find((url) => /(^|\.)linkedin\.com$/i.test(getUrlHost(url))) || "";
  const gitHub = urls.find((url) => /(^|\.)github\.com$/i.test(getUrlHost(url))) || "";
  const labelledPortfolio = extractNamedUrl(lines, /\b(portfolio|website|personal site|web site)\b/i);
  const portfolio =
    labelledPortfolio && !isSocialUrl(labelledPortfolio)
      ? labelledPortfolio
      : urls.find((url) => !isSocialUrl(url) && !url.includes(email.split("@")[1] || " ")) || "";

  const name =
    lines.slice(0, 12).find((line) => isLikelyName(line, email, phone)) ||
    lines.find((line) => isLikelyName(line, email, phone)) ||
    "";

  const skills = extractSkills(compactText, lines);
  const experienceStart = lines.findIndex((line) => /experience|employment|work history/i.test(line));
  const experience =
    experienceStart >= 0
      ? lines.slice(experienceStart, experienceStart + 15).join("\n").slice(0, 1200)
      : compactText.slice(0, 1200);

  return {
    name,
    email,
    phone,
    linkedIn,
    portfolio,
    gitHub,
    skills,
    experience
  };
};

export const parseResumeText = async (resumeText: string): Promise<UserProfile> => {
  const prompt = PromptManager.getResumeParsePrompt(resumeText);
  const localProfile = extractLocalResumeProfile(resumeText);

  // Call AI Service by providing the prompt.
  let responseText = "";

  try {
    responseText = await generateAiReply({
      prompt,
      history: []
    });

    const parsed = robustJsonParse<Partial<UserProfile>>(responseText);
    return {
      name: parsed.name || localProfile.name,
      email: parsed.email || localProfile.email,
      phone: parsed.phone || localProfile.phone,
      linkedIn: parsed.linkedIn === "Unknown" ? "" : parsed.linkedIn || "",
      portfolio: parsed.portfolio === "Unknown" ? "" : parsed.portfolio || localProfile.portfolio,
      gitHub: parsed.gitHub === "Unknown" ? "" : parsed.gitHub || localProfile.gitHub || "",
      skills: Array.isArray(parsed.skills) && parsed.skills.length > 0 ? parsed.skills : localProfile.skills,
      experience: parsed.experience || localProfile.experience
    };
  } catch (error) {
    console.warn("AI resume parsing failed. Falling back to local extraction.", responseText, error);
    if (
      localProfile.name ||
      localProfile.email ||
      localProfile.phone ||
      localProfile.skills.length > 0 ||
      localProfile.experience
    ) {
      return localProfile;
    }

    throw new Error("Failed to parse resume text into structured format.");
  }
};
