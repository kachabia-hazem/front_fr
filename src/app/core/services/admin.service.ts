import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company, Freelancer, Admin } from '../models/user.model';

export interface AdminStats {
  totalFreelancers: number;
  totalCompanies: number;
  pendingCompanies: number;
  approvedCompanies: number;
  rejectedCompanies: number;
  totalMissions: number;
  totalContracts: number;
  totalApplications: number;
  totalAdmins: number;
  generatedAt: string;
}

export interface UserEvolutionPoint {
  month: string;
  freelancers: number;
  companies: number;
  total: number;
}

export interface ContractEvolutionPoint {
  month: string;
  total: number;
  signed: number;
  finished: number;
}

export interface ToggleBanResponse {
  id: string;
  isActive: boolean;
  message: string;
}

export interface AdminPaymentOverview {
  totalEscrow: number;
  releasedThisMonth: number;
  totalPlatformCommission: number;
  escrowContractCount: number;
  capturedThisMonthCount: number;
  totalCapturedContracts: number;
}

export interface AdminContractPayment {
  id: string;
  freelancerName: string;
  freelancerEmail: string;
  companyName: string;
  companyEmail: string;
  missionTitle: string;
  totalAmount: number | null;
  platformFee: number | null;
  freelancerAmount: number | null;
  paymentStatus: string;
  createdAt: string;
  paidAt: string | null;
  capturedAt: string | null;
}

export interface AdminPointTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  points: number;
  amount: number;
  description: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // ─── Stats ────────────────────────────────────────────────────────────────
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/stats`);
  }

  // ─── Companies ────────────────────────────────────────────────────────────
  getPendingCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/companies/pending`);
  }

  getAllCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/companies`);
  }

  getCompanyById(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/companies/${id}`);
  }

  approveCompany(id: string): Observable<Company> {
    return this.http.post<Company>(`${this.apiUrl}/companies/${id}/approve`, {});
  }

  rejectCompany(id: string, reason: string): Observable<Company> {
    return this.http.post<Company>(`${this.apiUrl}/companies/${id}/reject`, { reason });
  }

  toggleCompanyBan(id: string, banReason?: string): Observable<ToggleBanResponse> {
    return this.http.post<ToggleBanResponse>(`${this.apiUrl}/companies/${id}/toggle-ban`, banReason ? { banReason } : {});
  }

  deleteCompany(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/companies/${id}`);
  }

  refreshTrustScore(id: string): Observable<Company> {
    return this.http.post<Company>(`${this.apiUrl}/companies/${id}/refresh-trust-score`, {});
  }

  // ─── Freelancers ──────────────────────────────────────────────────────────
  getAllFreelancers(): Observable<Freelancer[]> {
    return this.http.get<Freelancer[]>(`${this.apiUrl}/freelancers`);
  }

  getFreelancerById(id: string): Observable<Freelancer> {
    return this.http.get<Freelancer>(`${this.apiUrl}/freelancers/${id}`);
  }

  toggleFreelancerBan(id: string, banReason?: string): Observable<ToggleBanResponse> {
    return this.http.post<ToggleBanResponse>(`${this.apiUrl}/freelancers/${id}/toggle-ban`, banReason ? { banReason } : {});
  }

  deleteFreelancer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/freelancers/${id}`);
  }

  // ─── Admins ───────────────────────────────────────────────────────────────
  getAllAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(`${this.apiUrl}/admins`);
  }

  // ─── Evolution charts ─────────────────────────────────────────────────────
  getUsersEvolution(months: number): Observable<UserEvolutionPoint[]> {
    return this.http.get<UserEvolutionPoint[]>(`${this.apiUrl}/stats/users-evolution?months=${months}`);
  }

  getContractsEvolution(months: number): Observable<ContractEvolutionPoint[]> {
    return this.http.get<ContractEvolutionPoint[]>(`${this.apiUrl}/stats/contracts-evolution?months=${months}`);
  }

  // ─── Payment analytics (admin) ────────────────────────────────────────────
  getPaymentOverview(): Observable<AdminPaymentOverview> {
    return this.http.get<AdminPaymentOverview>(`${this.apiUrl}/payments/overview`);
  }

  getContractPayments(status?: string, search?: string): Observable<AdminContractPayment[]> {
    let url = `${this.apiUrl}/payments/contracts`;
    const params: string[] = [];
    if (status && status !== 'ALL') params.push(`status=${status}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<AdminContractPayment[]>(url);
  }

  getPointTransactions(): Observable<AdminPointTransaction[]> {
    return this.http.get<AdminPointTransaction[]>(`${this.apiUrl}/payments/transactions/points`);
  }
}
