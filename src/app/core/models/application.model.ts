export interface CreateApplicationRequest {
  missionId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  country: string;
  postalCode?: string;
  city?: string;
  postalAddress?: string;
  cvUrl?: string;
  salaryExpectations: string;
  currentSalaryAndNotice: string;
  previouslyWorked: string;
  previousWorkDate?: string;
  previousWorkExperience?: string;
}

export interface RankedApplication {
  applicationId: string;
  freelancerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  cvUrl?: string;
  salaryExpectations?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  submittedAt: string;
  freelancerCurrentPosition?: string;
  freelancerProfilePicture?: string;
  freelancerSkills?: string[];
  freelancerYearsOfExperience?: number;
  freelancerRating?: number;
  freelancerBio?: string;
  rank: number;
  totalScore: number;
  skillScore: number;
  experienceScore: number;
  semanticScore: number;
  completenessScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface Application {
  id: string;
  freelancerId: string;
  missionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  postalCode?: string;
  city?: string;
  postalAddress?: string;
  cvUrl?: string;
  salaryExpectations: string;
  currentSalaryAndNotice: string;
  previouslyWorked: string;
  previousWorkDate?: string;
  previousWorkExperience?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  submittedAt: string;
  updatedAt: string;
  missionTitle?: string;
  companyName?: string;
  companyLogo?: string;
  freelancerSkills?: string[];
  freelancerProfilePicture?: string;
  freelancerCurrentPosition?: string;
}
