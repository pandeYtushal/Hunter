import { analyzeJobFit } from "../ai/matchAgent";
import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import type { JobDetails, MatchAnalysis } from "../types/Job";

export const ResumeAgent = {
  async matchResume(job: JobDetails, profile: UserProfile): Promise<MatchAnalysis> {
    const pageContextFake: PageSnapshot = {
      title: `${job.title} at ${job.company}`,
      url: "",
      host: "",
      selectedText: "",
      description: `Job description: ${job.experience || "Not specified"}. Required skills: ${(job.skills || []).join(", ")}`,
      content: `Role: ${job.title}. Company: ${job.company}. Location: ${job.location}. Salary: ${job.salary}. Experience: ${job.experience}. Skills: ${(job.skills || []).join(", ")}`
    };

    return await analyzeJobFit(pageContextFake, profile);
  }
};
