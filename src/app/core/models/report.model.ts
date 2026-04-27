export type ReportStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TRAITE' | 'REJETE';
export type ReportType =
  | 'FRAUDE'
  | 'COMPORTEMENT'
  | 'PAIEMENT'
  | 'DOCUMENT_FALSIFIE'
  | 'HORS_SUJET'
  | 'BUG_TECHNIQUE'
  | 'PROBLEME_NOTIFICATION'
  | 'PROBLEME_MESSAGERIE'
  | 'ACCES_FONCTIONNALITE'
  | 'CONTENU_INAPPROPRIE'
  | 'COMPTE_INJUSTE'
  | 'AUTRE';

export interface Report {
  id: string;
  status: ReportStatus;
  type: ReportType;
  customType?: string;
  reportedById: string;
  reportedByRole: 'FREELANCER' | 'COMPANY';
  reportedByName: string;
  reportedByEmail: string;
  description?: string;
  adminNote?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CreateReportRequest {
  type: ReportType;
  customType?: string;
  description: string;
}
