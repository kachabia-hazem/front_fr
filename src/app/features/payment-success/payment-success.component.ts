import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ps-page">
      <div class="ps-card">

        @if (verifying()) {
          <div class="ps-spinner"></div>
          <p class="ps-verifying">Vérification du paiement en cours…</p>
        } @else {
          <div class="ps-icon">✓</div>
          <h1 class="ps-title">Paiement confirmé !</h1>
          <p class="ps-msg">
            @if (isPack()) {
              Votre pack de points a été crédité sur votre compte. Vous pouvez maintenant utiliser vos points.
            } @else {
              Le paiement a été sécurisé. Les fonds seront libérés au freelancer après validation de la mission.
            }
          </p>
          @if (errorMsg()) {
            <p class="ps-warn">⚠️ {{ errorMsg() }}</p>
          }
          <div class="ps-actions">
            <button class="ps-btn" (click)="goBack()">Retour à mon espace</button>
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
  errorMsg  = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private paymentService: PaymentService,
  ) {}

  ngOnInit() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const pack      = this.route.snapshot.queryParamMap.get('pack');

    if (sessionId && pack) {
      // Pack purchase redirect from Stripe Checkout — verify & credit points
      this.isPack.set(true);
      this.verifying.set(true);
      this.paymentService.verifyPackPurchase(sessionId).subscribe({
        next: () => this.verifying.set(false),
        error: (err) => {
          this.verifying.set(false);
          const msg = err?.error?.error || '';
          // "already processed" is not an error — idempotency
          if (!msg.toLowerCase().includes('already')) {
            this.errorMsg.set('Les points seront crédités dans quelques instants.');
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
