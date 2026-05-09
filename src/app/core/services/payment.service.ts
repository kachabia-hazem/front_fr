import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ContractPaymentIntent,
  ContractPaymentStatus,
  FreelancerPaymentSummary,
  PackCheckoutResponse,
  SavedCard
} from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  /** Create escrow PaymentIntent for a signed contract (company only) */
  createContractPaymentIntent(contractId: string): Observable<ContractPaymentIntent> {
    return this.http.post<ContractPaymentIntent>(
      `${this.apiUrl}/contract/${contractId}/intent`, {}
    );
  }

  /** Get current payment status of a contract */
  getContractPaymentStatus(contractId: string): Observable<ContractPaymentStatus> {
    return this.http.get<ContractPaymentStatus>(
      `${this.apiUrl}/contract/${contractId}/status`
    );
  }

  /** Create Stripe Checkout session for point pack purchase */
  createPackCheckout(packId: string, locale = 'en'): Observable<PackCheckoutResponse> {
    const params = new HttpParams().set('packId', packId).set('locale', locale);
    return this.http.post<PackCheckoutResponse>(
      `${this.apiUrl}/packs/checkout`, {}, { params }
    );
  }

  /** Get escrow + earned balance summary for the authenticated freelancer */
  getFreelancerPaymentSummary(): Observable<FreelancerPaymentSummary> {
    return this.http.get<FreelancerPaymentSummary>(`${this.apiUrl}/freelancer/summary`);
  }

  /** Called after Stripe.js confirmPayment() succeeds.
   *  Retrieves PaymentIntent from Stripe API and updates contract status — no webhook needed. */
  syncContractPayment(contractId: string): Observable<ContractPaymentStatus> {
    return this.http.post<ContractPaymentStatus>(
      `${this.apiUrl}/contract/${contractId}/sync`, {}
    );
  }

  /** Called from /payment/success page after Stripe Checkout redirect.
   *  Verifies the session is paid and credits points — no webhook needed. */
  verifyPackPurchase(sessionId: string): Observable<{ status: string }> {
    const params = new HttpParams().set('sessionId', sessionId);
    return this.http.post<{ status: string }>(
      `${this.apiUrl}/packs/verify`, {}, { params }
    );
  }

  /** Create Stripe Checkout session for subscription plan purchase */
  createSubscriptionCheckout(planId: string, locale = 'en'): Observable<{ checkoutUrl: string }> {
    const params = new HttpParams().set('planId', planId).set('locale', locale);
    return this.http.post<{ checkoutUrl: string }>(
      `${this.apiUrl}/subscriptions/checkout`, {}, { params }
    );
  }

  /** Called from /payment/success after Stripe Checkout redirect for subscription.
   *  Verifies the session is paid and activates the subscription — no webhook needed. */
  verifySubscriptionPurchase(sessionId: string): Observable<{ status: string }> {
    const params = new HttpParams().set('sessionId', sessionId);
    return this.http.post<{ status: string }>(
      `${this.apiUrl}/subscriptions/verify`, {}, { params }
    );
  }

  /** Create a Stripe Setup Intent → returns clientSecret for confirmSetup() */
  createSetupIntent(): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(`${this.apiUrl}/payment-methods/setup`, {});
  }

  /** List saved payment cards for the authenticated user */
  listPaymentMethods(): Observable<SavedCard[]> {
    return this.http.get<SavedCard[]>(`${this.apiUrl}/payment-methods`);
  }

  /** Remove a saved card by payment method ID */
  deletePaymentMethod(pmId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/payment-methods/${pmId}`);
  }
}
