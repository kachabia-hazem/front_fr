export type NotificationType =
  | 'WELCOME'
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_WITHDRAWN'
  | 'NEW_MISSION_MATCH'
  | 'MISSION_DEADLINE_SOON'
  | 'PROFILE_INCOMPLETE';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  senderName: string;
  senderId?: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}
