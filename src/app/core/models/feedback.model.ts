export interface FeedbackPublicDto {
  id: string;
  userRole: 'COMPANY' | 'FREELANCER';
  userName: string;
  userPhoto?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  missionId: string;
  missionTitle: string;
  userId: string;
  userRole: 'COMPANY' | 'FREELANCER';
  userName?: string;
  userPhoto?: string;
  rating: number;
  comment?: string;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  createdAt: string;
  validatedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

export interface SubmitFeedbackRequest {
  missionId: string;
  rating: number;
  comment?: string;
}
