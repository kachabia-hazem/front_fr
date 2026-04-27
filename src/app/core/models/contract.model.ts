export type ContractStatus = 'PENDING_SIGNATURE' | 'SIGNED' | 'FINISHED' | 'CANCELLED' | 'REJECTED';
export type PaymentStatus = 'UNPAID' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

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
  companySignedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  // Payment fields
  paymentStatus: PaymentStatus | null;
  totalAmount: number | null;
  platformFee: number | null;
  freelancerAmount: number | null;
  paidAt: string | null;
  capturedAt: string | null;
}
