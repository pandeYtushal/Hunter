import { extractJobDetails } from "../ai/jobAgent";
import { generateCoverLetter as coreGenerateCoverLetter } from "../ai/coverLetterAgent";
import type { PageSnapshot } from "../shared/types/messages";
import type { CoverLetterRecord, UserProfile } from "../shared/types/storage";
import type { JobAgentOutput, JobDetails } from "../types/Job";

export const JobAgent = {
  async extractJob(pageContext: PageSnapshot): Promise<JobAgentOutput> {
    const details = await extractJobDetails(pageContext);
    
    // Check match suitability against stored profile skills
    const result = await chrome.storage.sync.get("profile");
    const profile = (result.profile as UserProfile) || { skills: [], name: "" };
    
    let matchScore = 0;
    if (profile.skills.length > 0 && details.skills.length > 0) {
      const matched = details.skills.filter((s) => 
        profile.skills.some((ps) => ps.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ps.toLowerCase()))
      );
      matchScore = Math.round((matched.length / details.skills.length) * 100);
    }

    return {
      ...details,
      matchScore: matchScore || 50 // Fallback score of 50 if no skills are defined
    };
  },

  async generateCoverLetter(job: JobDetails, profile: UserProfile): Promise<CoverLetterRecord> {
    const pageContextFake: PageSnapshot = {
      title: `${job.title} at ${job.company}`,
      url: "",
      host: "",
      selectedText: "",
      description: `Job description: ${job.experience || "Not specified"}. Required skills: ${(job.skills || []).join(", ")}`,
      content: `Role: ${job.title}. Company: ${job.company}. Location: ${job.location}. Salary: ${job.salary}. Experience: ${job.experience}.`
    };

    const record = await coreGenerateCoverLetter(pageContextFake, profile);
    return {
      id: crypto.randomUUID(),
      company: record.company || job.company,
      role: record.role || job.title,
      content: record.coverLetter,
      createdAt: new Date().toISOString()
    };
  }
};
