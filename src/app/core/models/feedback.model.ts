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
