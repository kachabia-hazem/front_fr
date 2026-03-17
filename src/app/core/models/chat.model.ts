export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'COMPANY' | 'FREELANCER';
  content: string;
  timestamp: string;
  read: boolean;
}

export interface PresenceEvent {
  userId: string;
  online: boolean;
  lastSeen?: string;
}

export interface TypingEvent {
  userId: string;
  typing: boolean;
}

export interface ReadReceiptEvent {
  readerId: string;
  conversationId: string;
}

export interface ChatConversation {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  freelancerId: string;
  freelancerName: string;
  freelancerPicture?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: Record<string, number>;
  hasContract: boolean;
}
