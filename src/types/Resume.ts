export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string;
  resumeFileName?: string;
  linkedIn?: string;
  portfolio?: string;
}

export interface GeneratedCoverLetter {
  company: string;
  role: string;
  coverLetter: string;
}
