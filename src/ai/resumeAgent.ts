import { generateAiReply } from "./aiService";
import type { UserProfile, SkillCategoryGroup, SkillItem, ExperienceItem, ProjectItem, EducationItem } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";

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

export interface ResumeSegments {
  personal: string[];
  summary: string[];
  skills: string[];
  experience: string[];
  projects: string[];
  education: string[];
  certifications: string[];
  achievements: string[];
  publications: string[];
  languages: string[];
}

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

const isLikelyName = (line: string, email: string, phone: string) => {
  const normalized = line.replace(/[|•·]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > 60) return false;
  if (email && normalized.includes(email)) return false;
  if (phone && normalized.includes(phone)) return false;
  if (/[0-9@:/\\]/.test(normalized)) return false;
  const lower = normalized.toLowerCase();
  if (/(summary|objective|education|experience|projects|skills|certifications|achievements)/.test(lower)) return false;
  if (/(resume|curriculum vitae|cv|developer|engineer|student|manager|designer|analyst)/i.test(normalized)) {
    return false;
  }

  const words = normalized.split(/\s+/);
  return words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Za-z][A-Za-z.'-]*$/.test(word));
};

const extractSkills = (text: string, lines: string[]): string[] => {
  const knownSkills = KNOWN_SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, "i").test(text);
  });
  return Array.from(new Set(knownSkills)).slice(0, 40);
};

export const segmentResumeText = (resumeText: string): ResumeSegments => {
  const lines = resumeText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const segments: ResumeSegments = {
    personal: [],
    summary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    publications: [],
    languages: []
  };

  let currentSection: keyof ResumeSegments = "personal";

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    if (line.length < 40) {
      if (/^(summary|profile|about|about me|objective)$/i.test(lower)) {
        currentSection = "summary";
        continue;
      }
      if (/^(skills|technical skills|key skills|technologies|tools)$/i.test(lower)) {
        currentSection = "skills";
        continue;
      }
      if (/^(work experience|professional experience|experience|internships|employment|work history)$/i.test(lower)) {
        currentSection = "experience";
        continue;
      }
      if (/^(projects|academic projects|key projects|personal projects|portfolio)$/i.test(lower)) {
        currentSection = "projects";
        continue;
      }
      if (/^(education|academic background|academics|qualifications)$/i.test(lower)) {
        currentSection = "education";
        continue;
      }
      if (/^(certifications|certificates|licenses)$/i.test(lower)) {
        currentSection = "certifications";
        continue;
      }
      if (/^(achievements|awards|honors)$/i.test(lower)) {
        currentSection = "achievements";
        continue;
      }
      if (/^(publications|papers|patents)$/i.test(lower)) {
        currentSection = "publications";
        continue;
      }
      if (/^(languages|languages spoken)$/i.test(lower)) {
        currentSection = "languages";
        continue;
      }
    }

    segments[currentSection].push(line);
  }

  return segments;
};

export const getStructuredParsePrompt = (segments: ResumeSegments): string => {
  return `You are a strict resume parser agent. Your goal is to convert the segmented resume text into a structured JSON profile.
You must parse candidate details, skills, experiences, projects, education, certifications, and achievements strictly within their defined section text.

Do NOT invent or guess information. Do NOT classify content outside its section.
If a section is empty or has no valid details, return an empty array or empty values.

--- RESUME SEGMENTS ---

PERSONAL / CONTACT:
${segments.personal.join("\n")}

SUMMARY / PROFILE:
${segments.summary.join("\n")}

SKILLS:
${segments.skills.join("\n")}

WORK EXPERIENCE:
${segments.experience.join("\n")}

PROJECTS:
${segments.projects.join("\n")}

EDUCATION:
${segments.education.join("\n")}

CERTIFICATIONS:
${segments.certifications.join("\n")}

ACHIEVEMENTS:
${segments.achievements.join("\n")}

--- OUTPUT FORMAT ---
Return a clean, valid JSON object matching the following structure. Do NOT include markdown code blocks, surrounding explanation, or any intro/outro. Just the raw JSON:

{
  "personal": {
    "name": "Candidate Name (or 'Unknown')",
    "email": "Email Address (or 'Unknown')",
    "phone": "Phone Number (or 'Unknown')",
    "linkedIn": "LinkedIn profile URL (or '')",
    "gitHub": "GitHub profile URL (or '')",
    "portfolio": "Portfolio website URL (or '')"
  },
  "education": [
    {
      "institute": "College/University/School name",
      "degree": "Degree description",
      "cgpa": "GPA or CGPA (or '')",
      "graduation": "Graduation year (or '')"
    }
  ],
  "experience": [
    {
      "company": "Company or Organization name",
      "role": "Job Title",
      "employmentType": "Full-time, Part-time, Internship, etc.",
      "duration": "Duration range",
      "location": "Location",
      "responsibilities": ["Daily tasks/responsibilities"],
      "technologies": ["Technologies used"]
    }
  ],
  "projects": [
    {
      "title": "Project Title",
      "description": "Short description of what was built",
      "technologies": ["Technologies used"],
      "gitHub": "Project github url (or '')",
      "liveLink": "Live project demo url (or '')",
      "role": "Role on project",
      "duration": "Duration (if available)"
    }
  ],
  "skills": {
    "languages": ["Programming languages"],
    "frontend": ["Frontend technologies"],
    "backend": ["Backend technologies"],
    "frameworks": ["Frameworks"],
    "databases": ["Databases"],
    "cloud": ["Cloud providers/services"],
    "AI/ML": ["AI/ML libraries/concepts"],
    "tools": ["Other tools/technologies"]
  },
  "certifications": ["Certification name"],
  "achievements": ["Achievement/Award description"]
}

STRICT CRITICAL RULES:
1. Experience must only come from WORK EXPERIENCE section. If empty, return experience = [].
2. Projects must only come from PROJECTS section. If empty, return projects = [].
3. Education must only come from EDUCATION section. If empty, return education = [].
4. Skills must only extract actual skill names. Do not include project descriptions or sentences. Group strictly.
5. Reject any experience that does not contain a Company/Organization name AND Role.
6. Reject any education that does not contain a College/University/School name AND Degree.
7. Reject any project that does not contain a Title AND Description.`;
};

// Check if an experience entry looks like a project rather than employment
const hasProjectKeywords = (company: string, role: string, description: string): boolean => {
  const c = company.toLowerCase();
  const r = role.toLowerCase();
  const d = description.toLowerCase();

  const projectKeywords = [
    "github", "git link", "live demo", "chrome extension", "hackathon", "personal project", 
    "academic project", "portfolio", "research paper", "built a", "developed a", "created a", 
    "implemented a", "engineered a", "dashboard", "website", "repository", "tech stack", "architecture",
    "api", "react", "node", "python", "ai"
  ];

  if (projectKeywords.some(k => c.includes(k) || r.includes(k) || d.includes(k))) {
    return true;
  }
  
  if (c.includes("personal") || c.includes("academic") || c.includes("self-employed") || c.includes("freelance") && !r) {
    return true;
  }

  return false;
};

const parseLocalSegments = (segments: ResumeSegments): UserProfile => {
  const email = segments.personal.join(" ").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = segments.personal.join(" ").match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s+/g, " ").trim() || "";
  
  const urls = getUrls(segments.personal.join(" "));
  const linkedIn = urls.find((url) => /(^|\.)linkedin\.com$/i.test(getUrlHost(url))) || "";
  const gitHub = urls.find((url) => /(^|\.)github\.com$/i.test(getUrlHost(url))) || "";
  const portfolio = urls.find((url) => !isSocialUrl(url)) || "";
  const name = segments.personal.find(line => isLikelyName(line, email, phone)) || "";

  // Local Experience Timeline extraction (ONLY from segments.experience)
  const rawExperience: any[] = [];
  let currentJob: any = null;
  for (const line of segments.experience) {
    const isDateLine = line.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Present|\b(?:19|20)\d{2}\b)/i);
    if (isDateLine) {
      if (currentJob) {
        rawExperience.push(currentJob);
      }
      let role = "Software Developer";
      let company = "Company";
      const parts = line.split(/[|•·,]/);
      if (parts.length >= 2) {
        role = parts[0].trim();
        company = parts[1].trim();
      }
      currentJob = {
        company,
        role,
        duration: line.match(/\b(19|20)\d{2}\b/)?.[0] || "Present",
        location: "Remote",
        responsibilities: [],
        technologies: [],
        achievements: []
      };
    } else if (currentJob) {
      if (line.startsWith("-") || line.startsWith("•") || line.startsWith("▪") || line.startsWith("*")) {
        currentJob.responsibilities.push(line.replace(/^[-•▪*]\s*/, ""));
      } else if (currentJob.responsibilities.length < 5) {
        currentJob.responsibilities.push(line);
      }
    }
  }
  if (currentJob) {
    rawExperience.push(currentJob);
  }

  // Local Projects extraction (ONLY from segments.projects)
  const rawProjects: any[] = [];
  let currentProj: any = null;
  for (const line of segments.projects) {
    const isTitleLine = line.length < 40 && /^[A-Z\d][A-Za-z\d\s-–—:|]{3,35}$/.test(line);
    if (isTitleLine) {
      if (currentProj) {
        rawProjects.push(currentProj);
      }
      currentProj = {
        title: line.replace(/^[-•▪*]\s*/, ""),
        description: "",
        technologies: [],
        gitHub: "",
        portfolio: "",
        role: "Developer",
        impact: ""
      };
    } else if (currentProj) {
      if (line.includes("github.com")) {
        currentProj.gitHub = getUrls(line)[0] || "";
      } else if (line.includes("http")) {
        currentProj.portfolio = getUrls(line)[0] || "";
      } else {
        if (currentProj.description.length < 300) {
          currentProj.description += (currentProj.description ? " " : "") + line;
        }
      }
    }
  }
  if (currentProj) {
    rawProjects.push(currentProj);
  }

  // Local Education extraction (ONLY from segments.education)
  const rawEducation: any[] = [];
  let currentEdu: any = null;
  for (let i = 0; i < segments.education.length; i++) {
    const line = segments.education[i];
    const gpa = line.match(/(?:gpa|cgpa|marks|percentage|g\.p\.a)[\s:]*([0-9.%/]+)/i);
    const degree = line.match(/(?:bachelor|master|b\.s|m\.s|b\.tech|m\.tech|b\.e|m\.e|mba|phd|diploma|b\.com|b\.sc|high school|hsc|ssc)\b/i);
    const year = line.match(/\b(19|20)\d{2}\b/);
    const hasUniKeywords = /(?:university|college|institute|school|academy|polytechnic|iit|nit|bits)/i.test(line);
    
    if (degree || hasUniKeywords) {
      if (currentEdu) {
        rawEducation.push(currentEdu);
      }
      let institute = "University";
      let degreeName = line;
      if (hasUniKeywords) {
        institute = line;
        degreeName = segments.education[i+1] || "Degree";
      } else if (i > 0) {
        institute = segments.education[i-1];
      }
      currentEdu = {
        institute,
        degree: degreeName,
        cgpa: gpa ? gpa[1] : "",
        graduation: year ? year[0] : ""
      };
    } else if (currentEdu) {
      if (gpa && !currentEdu.cgpa) currentEdu.cgpa = gpa[1];
      if (year && !currentEdu.graduation) currentEdu.graduation = year[0];
    }
  }
  if (currentEdu) {
    rawEducation.push(currentEdu);
  }

  // VALIDATION & FILTERING WITH CONFIDENCE CHECKS
  const validatedExperience: ExperienceItem[] = [];
  const validatedProjects: ProjectItem[] = [];
  const validatedEducation: EducationItem[] = [];

  // Education Validation
  rawEducation.forEach(edu => {
    const inst = (edu.institute || "").trim();
    const deg = (edu.degree || "").trim();
    if (inst && deg) {
      validatedEducation.push({
        institute: inst,
        degree: deg,
        cgpa: edu.cgpa || "",
        graduation: edu.graduation || ""
      });
    }
  });

  // Second Pass Validation: Review Experience Pool
  rawExperience.forEach(job => {
    const comp = (job.company || "").trim();
    const role = (job.role || "").trim();
    const desc = Array.isArray(job.responsibilities) ? job.responsibilities.join(" ") : String(job.responsibilities || "");

    if (comp && role) {
      const isProject = hasProjectKeywords(comp, role, desc);
      if (isProject) {
        // Move to projects pool
        rawProjects.push({
          title: comp,
          description: desc || "Personal project implementation details",
          technologies: job.technologies || [],
          gitHub: "",
          portfolio: ""
        });
      } else {
        let conf = 80;
        if (job.duration) conf += 10;
        if (job.location) conf += 10;
        if (conf >= 70) {
          validatedExperience.push({
            company: comp,
            role: role,
            duration: job.duration || "Present",
            location: job.location || "Remote",
            responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.map(String) : [],
            technologies: Array.isArray(job.technologies) ? job.technologies.map(String) : [],
            achievements: []
          });
        }
      }
    }
  });

  // Projects Validation
  rawProjects.forEach(proj => {
    const title = (proj.title || "").trim();
    const desc = (proj.description || "").trim();
    if (title && desc) {
      let conf = 80;
      if (proj.technologies && proj.technologies.length > 0) conf += 10;
      if (proj.gitHub || proj.portfolio) conf += 10;
      if (conf >= 70) {
        validatedProjects.push({
          title,
          description: desc,
          technologies: Array.isArray(proj.technologies) ? proj.technologies.map(String) : [],
          gitHub: proj.gitHub || "",
          portfolio: proj.portfolio || "",
          role: proj.role || "Developer",
          impact: ""
        });
      }
    }
  });

  // Skills
  const skills = extractSkills(segments.skills.join(" "), segments.skills);
  const skillsGrouped: SkillCategoryGroup = {
    languages: [], frameworks: [], ai: [], backend: [], frontend: [],
    cloud: [], devops: [], databases: [], tools: []
  };
  skills.forEach((s: string) => {
    const l = s.toLowerCase();
    const item: SkillItem = { name: s, confidence: 85, source: "resume", experience: "2 years", usedIn: [], relatedProjects: [] };
    if (["javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "rust", "php", "swift", "kotlin", "sql", "html", "css"].some((w: string) => l.includes(w))) {
      skillsGrouped.languages.push(item);
    } else if (["react", "angular", "vue", "next.js", "django", "flask", "express", "spring boot", "laravel", "rails"].some((w: string) => l.includes(w))) {
      skillsGrouped.frameworks.push(item);
    } else if (["tailwind", "sass", "bootstrap", "webpack", "vite", "jquery"].some((w: string) => l.includes(w))) {
      skillsGrouped.frontend.push(item);
    } else if (["node.js", "fastapi", "graphql", "rest api", "nest.js"].some((w: string) => l.includes(w))) {
      skillsGrouped.backend.push(item);
    } else if (["pytorch", "tensorflow", "keras", "deep learning", "machine learning", "computer vision", "nlp", "scikit-learn"].some((w: string) => l.includes(w))) {
      skillsGrouped.ai.push(item);
    } else if (["postgresql", "mongodb", "mysql", "redis", "sqlite", "cassandra"].some((w: string) => l.includes(w))) {
      skillsGrouped.databases.push(item);
    } else if (["aws", "azure", "gcp", "google cloud", "heroku", "vercel"].some((w: string) => l.includes(w))) {
      skillsGrouped.cloud.push(item);
    } else if (["docker", "kubernetes", "jenkins", "terraform", "ansible", "ci/cd", "github actions"].some((w: string) => l.includes(w))) {
      skillsGrouped.devops.push(item);
    } else {
      skillsGrouped.tools.push(item);
    }
  });

  let totalYears = 0;
  validatedExperience.forEach(job => {
    const years = job.duration.match(/\b(19|20)\d{2}\b/g);
    if (years && years.length === 2) {
      const diff = parseInt(years[1]) - parseInt(years[0]);
      totalYears += diff > 0 ? diff : 1;
    } else if (job.duration.toLowerCase().includes("present")) {
      const startYear = job.duration.match(/\b(19|20)\d{2}\b/);
      if (startYear) {
        const diff = new Date().getFullYear() - parseInt(startYear[0]);
        totalYears += diff > 0 ? diff : 1;
      }
    }
  });

  const yearsOfExperience = String(totalYears || 0);
  const careerLevel = totalYears === 0 ? "Fresher" : totalYears <= 1 ? "Entry-level" : "Junior";

  return {
    name,
    email,
    phone,
    linkedIn,
    portfolio,
    gitHub,
    skills,
    experience: validatedExperience.map(e => `${e.role} at ${e.company}`).join("\n"),
    currentRole: validatedExperience[0]?.role || "Developer",
    yearsOfExperience,
    location: "Global",
    summary: segments.summary.join(" ").slice(0, 300),
    careerLevel,
    skillsGrouped,
    projects: validatedProjects,
    experienceTimeline: validatedExperience,
    educationList: validatedEducation
  };
};

export const parseResumeText = async (resumeText: string): Promise<UserProfile> => {
  const segments = segmentResumeText(resumeText);
  const prompt = getStructuredParsePrompt(segments);
  const localProfile = parseLocalSegments(segments);

  let responseText = "";

  try {
    responseText = await generateAiReply({
      prompt,
      history: []
    });

    const parsed = robustJsonParse<any>(responseText);

    const rawExperience = Array.isArray(parsed.experience) ? parsed.experience : [];
    const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
    const rawEducation = Array.isArray(parsed.education) ? parsed.education : [];

    const validatedExperience: ExperienceItem[] = [];
    const validatedProjects: ProjectItem[] = [];
    const validatedEducation: EducationItem[] = [];

    // 1. Education Validation (Required: College/University/School name AND Degree)
    rawEducation.forEach((edu: any) => {
      const institute = (edu.institute || edu.college || edu.university || edu.school || "").trim();
      const degree = (edu.degree || "").trim();
      if (institute && degree) {
        validatedEducation.push({
          institute,
          degree,
          cgpa: edu.cgpa || "",
          graduation: edu.graduation || ""
        });
      }
    });

    // 2. Second-Pass Validation: Review Experience Pool
    rawExperience.forEach((job: any) => {
      const company = (job.company || job.organization || "").trim();
      const role = (job.role || "").trim();
      const desc = Array.isArray(job.responsibilities) ? job.responsibilities.join(" ") : String(job.responsibilities || "");

      if (company && role) {
        const isProject = hasProjectKeywords(company, role, desc);
        if (isProject) {
          // Re-classify and move to projects pool
          rawProjects.push({
            title: company,
            description: desc || "Project details engineered by candidate",
            technologies: job.technologies || [],
            gitHub: "",
            portfolio: ""
          });
        } else {
          // Experience Confidence: Company + Role found = 80%. Duration = 10%. Location = 10%.
          let conf = 80;
          if (job.duration) conf += 10;
          if (job.location) conf += 10;

          if (conf >= 70) {
            validatedExperience.push({
              company,
              role,
              duration: job.duration || "Present",
              location: job.location || "Remote",
              responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities.map(String) : [],
              technologies: Array.isArray(job.technologies) ? job.technologies.map(String) : [],
              achievements: []
            });
          }
        }
      }
    });

    // 3. Projects Validation (Required: Title AND Description)
    rawProjects.forEach((proj: any) => {
      const title = (proj.title || proj.projectName || "").trim();
      const description = (proj.description || "").trim();

      if (title && description) {
        // Project Confidence: Title + Description found = 80%. Technologies = 10%. GitHub/liveLink = 10%.
        let conf = 80;
        if (proj.technologies && proj.technologies.length > 0) conf += 10;
        if (proj.gitHub || proj.liveLink || proj.portfolio) conf += 10;

        if (conf >= 70) {
          validatedProjects.push({
            title,
            description,
            technologies: Array.isArray(proj.technologies) ? proj.technologies.map(String) : [],
            gitHub: proj.gitHub || "",
            portfolio: proj.liveLink || proj.portfolio || "",
            role: proj.role || "Developer",
            impact: ""
          });
        }
      }
    });

    // Skills grouping
    const skillsGrouped: SkillCategoryGroup = {
      languages: [], frameworks: [], ai: [], backend: [], frontend: [],
      cloud: [], devops: [], databases: [], tools: []
    };

    const mapSkillList = (list: any[], cat: keyof SkillCategoryGroup) => {
      if (Array.isArray(list)) {
        list.forEach((s: string) => {
          if (s && typeof s === "string") {
            skillsGrouped[cat].push({
              name: s,
              confidence: 85,
              source: "resume",
              experience: "2 years",
              usedIn: [],
              relatedProjects: []
            });
          }
        });
      }
    };

    if (parsed.skills) {
      mapSkillList(parsed.skills.languages, "languages");
      mapSkillList(parsed.skills.frontend, "frontend");
      mapSkillList(parsed.skills.backend, "backend");
      mapSkillList(parsed.skills.frameworks, "frameworks");
      mapSkillList(parsed.skills.databases, "databases");
      mapSkillList(parsed.skills.cloud, "cloud");
      mapSkillList(parsed.skills["AI/ML"] || parsed.skills.ai, "ai");
      mapSkillList(parsed.skills.tools, "tools");
    }

    const flatSkills: string[] = [];
    Object.values(skillsGrouped).forEach((grp: SkillItem[]) => {
      grp.forEach((s: SkillItem) => flatSkills.push(s.name));
    });

    const personal = parsed.personal || {};

    let totalYears = 0;
    validatedExperience.forEach(job => {
      const years = job.duration.match(/\b(19|20)\d{2}\b/g);
      if (years && years.length === 2) {
        const diff = parseInt(years[1]) - parseInt(years[0]);
        totalYears += diff > 0 ? diff : 1;
      } else if (job.duration.toLowerCase().includes("present")) {
        const startYear = job.duration.match(/\b(19|20)\d{2}\b/);
        if (startYear) {
          const diff = new Date().getFullYear() - parseInt(startYear[0]);
          totalYears += diff > 0 ? diff : 1;
        }
      }
    });

    const yearsOfExperience = String(totalYears || 0);
    const careerLevel = totalYears === 0 ? "Fresher" : totalYears <= 1 ? "Entry-level" : "Junior";

    return {
      name: personal.name && personal.name !== "Unknown" ? personal.name : localProfile.name,
      email: personal.email && personal.email !== "Unknown" ? personal.email : localProfile.email,
      phone: personal.phone && personal.phone !== "Unknown" ? personal.phone : localProfile.phone,
      linkedIn: personal.linkedIn || localProfile.linkedIn || "",
      portfolio: personal.portfolio || localProfile.portfolio || "",
      gitHub: personal.gitHub || localProfile.gitHub || "",
      skills: flatSkills.length > 0 ? flatSkills : localProfile.skills,
      experience: validatedExperience.map(e => `${e.role} at ${e.company}`).join("\n"),
      currentRole: validatedExperience[0]?.role || localProfile.currentRole || "Software Developer",
      yearsOfExperience,
      location: personal.location || localProfile.location || "Global",
      summary: parsed.summary || localProfile.summary || "",
      careerLevel,
      skillsGrouped,
      projects: validatedProjects,
      experienceTimeline: validatedExperience,
      educationList: validatedEducation,
      certifications: parsed.certifications || [],
      awards: parsed.achievements || [],
      languagesList: parsed.languages || [],
      publications: parsed.publications || []
    };
  } catch (error) {
    console.warn("AI resume parsing failed. Falling back to local extraction.", responseText, error);
    return localProfile;
  }
};
