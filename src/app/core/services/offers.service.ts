import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PointPack {
  id: string;
  name: string;
  category: 'DECOUVERTE' | 'POPULAIRE' | 'PRO';
  points: number;
  price: number;
  pricePerPoint: number;
  savingsPercent: number;
  badge: string | null;
  active: boolean;
  displayOrder: number;
  promoEnabled: boolean;
  promoDiscountPercent: number;
  promoLabel: string;
  promoExpiresAt: string | null;
  promoPrice: number | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  pricePerMonth: number;
  pointsPerMonth: number;
  advantages: string[];
  active: boolean;
  displayOrder: number;
  promoEnabled: boolean;
  promoDiscountPercent: number;
  promoLabel: string;
  promoExpiresAt: string | null;
  promoPrice: number | null;
}

export interface CreatePackRequest {
  name: string;
  category: string;
  points: number;
  price: number;
  badge: string;
  active: boolean;
  displayOrder: number;
}

export interface CreateSubscriptionRequest {
  name: string;
  pricePerMonth: number;
  pointsPerMonth: number;
  advantages: string[];
  active: boolean;
  displayOrder: number;
}

export interface UpdatePackRequest {
  name: string;
  points: number;
  price: number;
  badge: string;
  active: boolean;
  displayOrder: number;
}

export interface UpdateSubscriptionRequest {
  name: string;
  pricePerMonth: number;
  pointsPerMonth: number;
  advantages: string[];
  active: boolean;
  displayOrder: number;
}

export interface UpdatePromoRequest {
  promoEnabled: boolean;
  promoDiscountPercent: number;
  promoLabel: string;
  promoExpiresAt: string | null;
}

export interface BalanceResponse {
  pointsBalance: number;
  transactions: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  type: 'PURCHASE_PACK' | 'SUBSCRIBE_PLAN' | 'APPLICATION' | 'AI_MATCHING' | 'BOOST' | 'FEATURED';
  description: string;
  points: number;
  amount: number;
  createdAt: string;
}

export interface CompanySubscriptionResponse {
  active: boolean;
  pointsBalance: number;
  plan: SubscriptionPlan | null;
  subscribedAt: string | null;
  expiresAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class OffersService {
  private readonly base = `${environment.apiUrl}/admin/offers`;
  private readonly userBase = `${environment.apiUrl}/offers`;

  readonly balanceDecremented$ = new Subject<number>();

  notifyBalanceDecremented(amount: number): void {
    this.balanceDecremented$.next(amount);
  }

  constructor(private http: HttpClient) {}

  getPlatformCosts(): Observable<{ applicationCost: number; aiMatchingCost: number; aiRankingCost: number }> {
    return this.http.get<{ applicationCost: number; aiMatchingCost: number; aiRankingCost: number }>(
      `${environment.apiUrl}/public/platform-costs`
    );
  }

  getPlatformStats(): Observable<{ freelancers: number; companies: number; missions: number; satisfactionRate: number }> {
    return this.http.get<{ freelancers: number; companies: number; missions: number; satisfactionRate: number }>(
      `${environment.apiUrl}/public/stats`
    );
  }

  // ── Packs ──────────────────────────────────────────────────────────────────
  getAllPacks(): Observable<PointPack[]> {
    return this.http.get<PointPack[]>(`${this.base}/packs`);
  }

  createPack(req: CreatePackRequest): Observable<PointPack> {
    return this.http.post<PointPack>(`${this.base}/packs`, req);
  }

  deletePack(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/packs/${id}`);
  }

  updatePack(id: string, req: UpdatePackRequest): Observable<PointPack> {
    return this.http.put<PointPack>(`${this.base}/packs/${id}`, req);
  }

  updatePackPromo(id: string, req: UpdatePromoRequest): Observable<PointPack> {
    return this.http.put<PointPack>(`${this.base}/packs/${id}/promo`, req);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────
  getAllSubscriptions(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.base}/subscriptions`);
  }

  createSubscription(req: CreateSubscriptionRequest): Observable<SubscriptionPlan> {
    return this.http.post<SubscriptionPlan>(`${this.base}/subscriptions`, req);
  }

  deleteSubscription(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/subscriptions/${id}`);
  }

  updateSubscription(id: string, req: UpdateSubscriptionRequest): Observable<SubscriptionPlan> {
    return this.http.put<SubscriptionPlan>(`${this.base}/subscriptions/${id}`, req);
  }

  updateSubscriptionPromo(id: string, req: UpdatePromoRequest): Observable<SubscriptionPlan> {
    return this.http.put<SubscriptionPlan>(`${this.base}/subscriptions/${id}/promo`, req);
  }

  // ── User-facing catalog ────────────────────────────────────────────────────
  getCatalogPacks(): Observable<PointPack[]> {
    return this.http.get<PointPack[]>(`${this.userBase}/packs`);
  }

  getCatalogSubscriptions(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.userBase}/subscriptions`);
  }

  // ── Freelancer ─────────────────────────────────────────────────────────────
  purchasePack(packId: string): Observable<BalanceResponse> {
    return this.http.post<BalanceResponse>(`${this.userBase}/packs/${packId}/purchase`, {});
  }

  getMyBalance(): Observable<BalanceResponse> {
    return this.http.get<BalanceResponse>(`${this.userBase}/my-balance`);
  }

  getMyCompanyBalance(): Observable<BalanceResponse> {
    return this.http.get<BalanceResponse>(`${this.userBase}/my-company-balance`);
  }

  // ── Company ────────────────────────────────────────────────────────────────
  subscribeToplan(planId: string): Observable<CompanySubscriptionResponse> {
    return this.http.post<CompanySubscriptionResponse>(`${this.userBase}/subscriptions/${planId}/subscribe`, {});
  }

  getMySubscription(): Observable<CompanySubscriptionResponse> {
    return this.http.get<CompanySubscriptionResponse>(`${this.userBase}/my-subscription`);
  }

  cancelSubscription(): Observable<CompanySubscriptionResponse> {
    return this.http.delete<CompanySubscriptionResponse>(`${this.userBase}/my-subscription`);
  }

  // ── Freelancer subscription ────────────────────────────────────────────────
  subscribeFreelancerToPlan(planId: string): Observable<CompanySubscriptionResponse> {
    return this.http.post<CompanySubscriptionResponse>(`${this.userBase}/subscriptions/${planId}/freelancer-subscribe`, {});
  }

  cancelFreelancerSubscription(): Observable<CompanySubscriptionResponse> {
    return this.http.delete<CompanySubscriptionResponse>(`${this.userBase}/my-freelancer-subscription`);
  }

  getMyFreelancerSubscription(): Observable<CompanySubscriptionResponse> {
    return this.http.get<CompanySubscriptionResponse>(`${this.userBase}/my-freelancer-subscription`);
  }
}
