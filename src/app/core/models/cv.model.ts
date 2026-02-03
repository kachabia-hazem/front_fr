export interface Education {
  id: string;
  diploma: string;
  institution: string;
  year: number;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  technologies: string[];
  url?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  certificateUrl?: string;
}

export interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

export interface CvData {
  bio?: string;
  education: Education[];
  projects: Project[];
  skills: string[];
  certifications: Certification[];
  workExperience: WorkExperience[];
}
