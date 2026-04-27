export type ReportStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TRAITE' | 'REJETE';
export type ReportType = 'FRAUDE' | 'COMPORTEMENT' | 'PAIEMENT' | 'DOCUMENT_FALSIFIE' | 'HORS_SUJET';

export interface Report {
  id: string;
  status: ReportStatus;
  type: ReportType;
  reportedById: string;
  reportedByRole: 'FREELANCER' | 'COMPANY';
  reportedByName: string;
  reportedByEmail: string;
  reportedAgainstId?: string;
  reportedAgainstRole?: 'FREELANCER' | 'COMPANY';
  reportedAgainstName?: string;
  reportedAgainstEmail?: string;
  contractId?: string;
  contractTitle?: string;
  description?: string;
  adminNote?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CreateReportRequest {
  type: ReportType;
  reportedAgainstId: string;
  contractId?: string;
  description: string;
}
