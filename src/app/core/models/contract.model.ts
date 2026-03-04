export type ContractStatus = 'PENDING_SIGNATURE' | 'SIGNED' | 'CANCELLED';

export interface Contract {
  id: string;
  jobId: string;
  freelancerId: string;
  companyId: string;
  freelancerName: string;
  freelancerEmail: string;
  companyName: string;
  companyEmail: string;
  missionTitle: string;
  salary: number | null;
  startDate: string | null;
  endDate: string | null;
  terms: string | null;
  status: ContractStatus;
  pdfUrl: string | null;
  signedPdfUrl: string | null;
  signedAt: string | null;
  createdAt: string;
}
