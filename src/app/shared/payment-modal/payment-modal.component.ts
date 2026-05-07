import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { PaymentService } from '../../core/services/payment.service';
import { LanguageService } from '../../core/services/language.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule],
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
  currency       = signal('DT');
  feePercent     = computed(() =>
    this.totalAmount() > 0 ? Math.round(this.platformFee() / this.totalAmount() * 100) : 0
  );

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;
  private langSub?: Subscription;

  constructor(
    private paymentService: PaymentService,
    private translate: TranslateService,
    private languageService: LanguageService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
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
        locale: this.languageService.currentLang() as any,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#6366f1' } },
      });

      this.paymentElement = this.elements.create('payment');
      this.paymentElement.mount('#stripe-payment-element');
      this.loading.set(false);
    } catch (err: any) {
      this.errorMessage.set(err?.message || this.translate.instant('payment_modal.error_init'));
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
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
      this.errorMessage.set(error.message || this.translate.instant('payment_modal.error_payment'));
      this.submitting.set(false);
      return;
    }

    // Payment confirmed by Stripe.js — now sync status directly with backend
    // (no need to wait for webhook)
    this.paymentService.syncContractPayment(this.contractId).subscribe({
      next: () => {
        this.successMsg.set(this.translate.instant('payment_modal.success_authorized'));
        this.submitting.set(false);
        setTimeout(() => this.paid.emit(), 1800);
      },
      error: () => {
        // Sync failed but payment went through — show success anyway
        this.successMsg.set(this.translate.instant('payment_modal.success_confirmed'));
        this.submitting.set(false);
        setTimeout(() => this.paid.emit(), 1800);
      },
    });
  }

  close() {
    this.closed.emit();
  }
}
