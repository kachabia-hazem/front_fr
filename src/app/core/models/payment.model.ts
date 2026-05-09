export type PaymentStatus = 'UNPAID' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface ContractPaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  totalAmount: number;
  platformFee: number;
  freelancerAmount: number;
  currency: string;
}

export interface ContractPaymentStatus {
  contractId: string;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  platformFee: number;
  freelancerAmount: number;
}

export interface PackCheckoutResponse {
  checkoutUrl: string;
}

export interface ContractPaymentItem {
  id: string;
  missionTitle: string;
  companyName: string;
  paymentStatus: PaymentStatus;
  freelancerAmount: number | null;
  freelancerRefundAmount: number | null;
  paidAt: string | null;
  capturedAt: string | null;
}

export interface FreelancerPaymentSummary {
  escrowBalance: number;
  earnedBalance: number;
  escrowContractCount: number;
  earnedContractCount: number;
  contracts: ContractPaymentItem[];
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}
