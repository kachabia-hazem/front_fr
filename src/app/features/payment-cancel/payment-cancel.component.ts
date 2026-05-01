import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pc-page">
      <div class="pc-card">
        <div class="pc-icon">✕</div>
        <h1 class="pc-title">Payment Cancelled</h1>
        <p class="pc-msg">Your payment has been cancelled. No amount has been charged. You can try again at any time.</p>
        <div class="pc-actions">
          <button class="pc-btn" (click)="goBack()">Go Back</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pc-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fef2f2; }
    .pc-card { background: #fff; border-radius: 16px; padding: 48px 40px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,.1); max-width: 440px; width: 90%; }
    .pc-icon { width: 72px; height: 72px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; color: #dc2626; margin: 0 auto 20px; }
    .pc-title { font-size: 1.5rem; font-weight: 700; color: #991b1b; margin: 0 0 12px; }
    .pc-msg { color: #4b5563; line-height: 1.6; margin: 0 0 28px; }
    .pc-btn { background: #6b7280; color: #fff; border: none; border-radius: 10px; padding: 12px 28px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity .2s; }
    .pc-btn:hover { opacity: .88; }
  `]
})
export class PaymentCancelComponent {
  constructor(private router: Router) {}
  goBack() { this.router.navigate(['/']); }
}
