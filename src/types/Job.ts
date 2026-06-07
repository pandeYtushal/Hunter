export interface JobDetails {
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: string;
  skills: string[];
}

export interface JobAgentOutput extends JobDetails {
  matchScore: number;
}

export interface MatchAnalysis {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string;
}
