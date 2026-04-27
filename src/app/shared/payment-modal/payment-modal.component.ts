import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { PaymentService } from '../../core/services/payment.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css',
})
export class PaymentModalComponent implements OnInit, OnDestroy {
  @Input() contractId!: string;
  @Input() missionTitle: string = '';
  @Output() closed   = new EventEmitter<void>();
  @Output() paid     = new EventEmitter<void>();

  loading       = signal(true);
  submitting    = signal(false);
  errorMessage  = signal('');
  successMsg    = signal('');

  totalAmount    = signal(0);
  platformFee    = signal(0);
  freelancerAmt  = signal(0);
  currency       = signal('EUR');

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  constructor(private paymentService: PaymentService) {}

  async ngOnInit() {
    try {
      // 1. Create PaymentIntent on backend
      const intent = await this.paymentService
        .createContractPaymentIntent(this.contractId)
        .toPromise();

      if (!intent) throw new Error('Failed to create payment intent');

      this.totalAmount.set(intent.totalAmount);
      this.platformFee.set(intent.platformFee);
      this.freelancerAmt.set(intent.freelancerAmount);
      this.currency.set(intent.currency);

      // 2. Load Stripe.js and mount Payment Element
      this.stripe = await loadStripe(environment.stripePublishableKey);
      if (!this.stripe) throw new Error('Stripe failed to load');

      this.elements = this.stripe.elements({
        clientSecret: intent.clientSecret,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#6366f1' } },
      });

      this.paymentElement = this.elements.create('payment');
      this.paymentElement.mount('#stripe-payment-element');
      this.loading.set(false);
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Une erreur est survenue lors de l\'initialisation du paiement.');
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.paymentElement?.unmount();
  }

  async confirmPayment() {
    if (!this.stripe || !this.elements) return;
    this.submitting.set(true);
    this.errorMessage.set('');

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      this.errorMessage.set(error.message || 'Le paiement a échoué. Veuillez réessayer.');
      this.submitting.set(false);
      return;
    }

    // Payment confirmed by Stripe.js — now sync status directly with backend
    // (no need to wait for webhook)
    this.paymentService.syncContractPayment(this.contractId).subscribe({
      next: () => {
        this.successMsg.set('Paiement autorisé ! Les fonds sont sécurisés en escrow.');
        this.submitting.set(false);
        setTimeout(() => this.paid.emit(), 1800);
      },
      error: () => {
        // Sync failed but payment went through — show success anyway
        this.successMsg.set('Paiement confirmé. Le statut sera mis à jour dans quelques instants.');
        this.submitting.set(false);
        setTimeout(() => this.paid.emit(), 1800);
      },
    });
  }

  close() {
    this.closed.emit();
  }
}
