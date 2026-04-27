import { CompanyStatus, Gender, Language, LegalForm, ProfileType, Role } from './enums.model';
import { Education, Project, Certification, WorkExperience } from './cv.model';

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Freelancer extends User {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  phoneNumber: string;
  yearsOfExperience: number;
  profileTypes: ProfileType[];
  tjm: number;
  languages: Language[];
  currentPosition?: string;
  location?: string;
  country?: string;
  postalCode?: string;
  city?: string;
  postalAddress?: string;
  bio?: string;
  profilePicture?: string;
  skills?: string[];
  portfolioUrl?: string;
  cvUrl?: string;
  rating: number;
  reviewCount: number;
  completedProjects: number;
  profileViews?: number;
  searchAppearances?: number;
  // Card customization
  cardBackground?: string;
  portfolioImages?: string[];
  // CV Data
  education?: Education[];
  projects?: Project[];
  certifications?: Certification[];
  workExperience?: WorkExperience[];
  // Points
  pointsBalance?: number;
}

export interface Company extends User {
  companyName: string;
  address?: string;
  websiteUrl?: string;
  legalForm: LegalForm;
  tradeRegister: string;
  foundationDate: string;
  businessSector: string;
  managerName: string;
  managerEmail: string;
  managerPosition: string;
  managerPhoneNumber: string;
  companyLogo?: string;
  description?: string;
  numberOfEmployees?: number;
  postedProjects: number;
  verificationStatus?: CompanyStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  trustScore?: number;
  // Points & subscription
  pointsBalance?: number;
  subscriptionPlanId?: string;
  subscriptionStartDate?: string;
  subscriptionExpiresAt?: string;
}

export interface Review {
  id: string;
  missionId: string;
  freelancerId: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Admin extends User {
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  phoneNumber: string;
  currentPosition?: string;
  yearsOfExperience?: number;
  department?: string;
  isSuperAdmin: boolean;
}
