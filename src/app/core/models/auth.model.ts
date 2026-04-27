import { Gender, LegalForm } from './enums.model';

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
  currentPosition?: string;
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

// ── Simple OAuth Complete Request ──

export interface OAuthCompleteRequest {
  role: string;
  email: string;
  providerId: string;
  provider: 'GOOGLE' | 'LINKEDIN';
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

// ── Generic OAuth Profile ──

export interface OAuthProfile {
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  provider: 'GOOGLE' | 'LINKEDIN';
}

// ── Response DTO ──

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  email: string;
  role: string;
  id: string;
  message: string;
  needsRegistration?: boolean;
  oauthProfile?: OAuthProfile;
  verificationStatus?: string;
}
