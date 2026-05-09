export type LegitStatus = 'EN_ATTENTE' | 'EN_COURS' | 'RESOLU' | 'REJETE';

export interface Legit {
  id: string;
  status: LegitStatus;
  activeMissionId: string;
  contractId: string;
  missionTitle: string;
  reporterId: string;
  reporterRole: string;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  otherPartyId: string;
  otherPartyRole: string;
  otherPartyName: string;
  otherPartyEmail: string;
  otherPartyPhone: string;
  description: string;
  totalAmount: number;
  resolution: string;
  evidenceFiles: string[];
  adminNote: string;
  adminDecision?: string;
  freelancerRefundPercentage?: number;
  companyRefundPercentage?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
}

export interface CreateLegitRequest {
  activeMissionId: string;
  description: string;
  totalAmount: number | null;
  resolution: string;
  evidenceFiles: string[];
}
