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
