export interface Mission {
  id?: string;
  companyId?: string;
  jobTitle: string;
  field: string;
  location: string;
  missionType: string;
  yearsOfExperience: number;
  startDate: string;
  endDate: string;
  description: string;
  requiredSkills: string;
  technicalEnvironment?: string;
  tjm: number;
  applicationDeadline?: string;
  missionBusinessSector?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;

  // Company info
  companyName?: string;
  companyLogo?: string;
  businessSector?: string;
  companyDescription?: string;
  numberOfEmployees?: number;
}

export interface CreateMissionRequest {
  jobTitle: string;
  field: string;
  location: string;
  missionType: string;
  yearsOfExperience: number;
  startDate: string;
  endDate: string;
  description: string;
  requiredSkills: string;
  technicalEnvironment?: string;
  tjm: number;
  applicationDeadline?: string;
  missionBusinessSector?: string;
}
