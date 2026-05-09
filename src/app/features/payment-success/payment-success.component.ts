import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="ps-page">
      <div class="ps-card">

        @if (verifying()) {
          <div class="ps-spinner"></div>
          <p class="ps-verifying">{{ 'payment_success.verifying' | translate }}</p>
        } @else {
          <div class="ps-icon">✓</div>
          <h1 class="ps-title">{{ 'payment_success.title' | translate }}</h1>
          <p class="ps-msg">
            @if (isPack()) {
              {{ 'payment_success.msg_pack' | translate }}
            } @else if (isPlan()) {
              {{ 'payment_success.msg_plan' | translate }}
            } @else {
              {{ 'payment_success.msg_contract' | translate }}
            }
          </p>
          @if (errorMsg()) {
            <p class="ps-warn">⚠️ {{ errorMsg() }}</p>
          }
          <div class="ps-actions">
            <button class="ps-btn" (click)="goBack()">{{ 'payment_success.go_back' | translate }}</button>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    .ps-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0fdf4; }
    .ps-card { background: #fff; border-radius: 16px; padding: 48px 40px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,.1); max-width: 440px; width: 90%; }
    .ps-icon { width: 72px; height: 72px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700; color: #16a34a; margin: 0 auto 20px; }
    .ps-title { font-size: 1.5rem; font-weight: 700; color: #166534; margin: 0 0 12px; }
    .ps-msg { color: #4b5563; line-height: 1.6; margin: 0 0 28px; }
    .ps-warn { color: #d97706; font-size: 0.85rem; margin: -16px 0 20px; }
    .ps-btn { background: #16a34a; color: #fff; border: none; border-radius: 10px; padding: 12px 28px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity .2s; }
    .ps-btn:hover { opacity: .88; }
    .ps-spinner { width: 44px; height: 44px; border: 4px solid #dcfce7; border-top-color: #16a34a; border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 20px; }
    .ps-verifying { color: #4b5563; font-size: .95rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class PaymentSuccessComponent implements OnInit {
  verifying = signal(false);
  isPack    = signal(false);
  isPlan    = signal(false);
  errorMsg  = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private paymentService: PaymentService,
    private translate: TranslateService,
  ) {}

  ngOnInit() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const pack      = this.route.snapshot.queryParamMap.get('pack');
    const plan      = this.route.snapshot.queryParamMap.get('plan');

    if (sessionId && pack) {
      this.isPack.set(true);
      this.verifying.set(true);
      this.paymentService.verifyPackPurchase(sessionId).subscribe({
        next: () => this.verifying.set(false),
        error: (err) => {
          this.verifying.set(false);
          const msg = err?.error?.error || '';
          if (!msg.toLowerCase().includes('already')) {
            this.errorMsg.set(this.translate.instant('payment_success.warn_delay'));
          }
        },
      });
    } else if (sessionId && plan) {
      this.isPlan.set(true);
      this.verifying.set(true);
      this.paymentService.verifySubscriptionPurchase(sessionId).subscribe({
        next: () => this.verifying.set(false),
        error: (err) => {
          this.verifying.set(false);
          const msg = err?.error?.error || '';
          if (!msg.toLowerCase().includes('already')) {
            this.errorMsg.set(this.translate.instant('payment_success.warn_plan_delay'));
          }
        },
      });
    }
  }

  goBack() {
    const role = this.authService.userRole();
    if (role === 'COMPANY') this.router.navigate(['/company-balance']);
    else if (role === 'FREELANCER') this.router.navigate(['/freelancer-balance']);
    else this.router.navigate(['/']);
  }
}
