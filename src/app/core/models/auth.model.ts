import { Gender, Language, LegalForm, ProfileType } from './enums.model';

// ── Request DTOs ──

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterFreelancerRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: Gender;
  dateOfBirth: string;
  phoneNumber: string;
  yearsOfExperience: number;
  profileTypes: ProfileType[];
  tjm: number;
  languages: Language[];
  currentPosition?: string;
  bio?: string;
  skills?: string[];
  portfolioUrl?: string;
}

export interface RegisterCompanyRequest {
  companyName: string;
  email: string;
  password: string;
  address: string;
  websiteUrl?: string;
  legalForm: LegalForm;
  tradeRegister: string;
  foundationDate: string;
  businessSector: string;
  managerName: string;
  managerEmail: string;
  managerPosition: string;
  managerPhoneNumber: string;
  description?: string;
  numberOfEmployees?: number;
}

export interface RegisterAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gender: Gender;
  dateOfBirth: string;
  phoneNumber: string;
  currentPosition?: string;
  yearsOfExperience?: number;
  department?: string;
}

// ── OAuth Request DTOs ──

export interface OAuthGoogleRequest {
  idToken: string;
}

export interface OAuthLinkedInRequest {
  code: string;
}

export interface OAuthLinkedInCompleteRequest {
  role: string;
  email: string;
  linkedInId?: string;
  // Freelancer fields
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  dateOfBirth?: string;
  phoneNumber?: string;
  yearsOfExperience?: number;
  profileTypes?: ProfileType[];
  tjm?: number;
  languages?: Language[];
  currentPosition?: string;
  bio?: string;
  skills?: string[];
  portfolioUrl?: string;
  profilePicture?: string;
  // Company fields
  companyName?: string;
  address?: string;
  websiteUrl?: string;
  legalForm?: LegalForm;
  tradeRegister?: string;
  foundationDate?: string;
  businessSector?: string;
  managerName?: string;
  managerEmail?: string;
  managerPosition?: string;
  managerPhoneNumber?: string;
  description?: string;
  numberOfEmployees?: number;
}

// ── LinkedIn Profile ──

export interface LinkedInProfile {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  picture: string;
}

// ── Response DTO ──

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
  id: string;
  message: string;
  needsRegistration?: boolean;
  linkedInProfile?: LinkedInProfile;
}
