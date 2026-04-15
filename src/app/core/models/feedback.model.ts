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
  rating: number;
  comment?: string;
  status: 'PENDING' | 'VALIDATED' | 'DELETED';
  createdAt: string;
}

export interface SubmitFeedbackRequest {
  missionId: string;
  rating: number;
  comment?: string;
}
