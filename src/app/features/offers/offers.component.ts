import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { OffersService, PointPack, SubscriptionPlan, BalanceResponse, CompanySubscriptionResponse } from '../../core/services/offers.service';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.css',
})
export class OffersComponent implements OnInit {
  activeTab  = signal<'packs' | 'plans'>('packs');
  loading    = signal(true);
  purchasing = signal(false);

  packs        = signal<PointPack[]>([]);
  plans        = signal<SubscriptionPlan[]>([]);
  myBalance    = signal<BalanceResponse | null>(null);
  mySub        = signal<CompanySubscriptionResponse | null>(null);

  confirmPack = signal<PointPack | null>(null);
  confirmPlan = signal<SubscriptionPlan | null>(null);
  toast       = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  get isFreelancer(): boolean { return this.authService.currentUser()?.role === 'FREELANCER'; }
  get isCompany(): boolean    { return this.authService.currentUser()?.role === 'COMPANY'; }
  get isAuth(): boolean       { return this.authService.isAuthenticated(); }

  pointsBalance = computed(() => this.myBalance()?.pointsBalance ?? this.mySub()?.pointsBalance ?? 0);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private offersService: OffersService,
    private router: Router,
    private paymentService: PaymentService,
  ) {}

  ngOnInit(): void {
    this.activeTab.set('packs');

    // Load both catalogs
    this.offersService.getCatalogPacks().subscribe({
      next: (p) => { this.packs.set(p); this.checkDone(); },
      error: () => this.checkDone(),
    });
    this.offersService.getCatalogSubscriptions().subscribe({
      next: (s) => { this.plans.set(s); this.checkDone(); },
      error: () => this.checkDone(),
    });

    // Load user balance
    if (this.isFreelancer) {
      this.offersService.getMyBalance().subscribe({ next: (b) => this.myBalance.set(b) });
    }
    if (this.isCompany) {
      this.offersService.getMySubscription().subscribe({ next: (s) => this.mySub.set(s) });
    }
  }

  private _loaded = 0;
  private checkDone(): void { if (++this._loaded >= 2) this.loading.set(false); }

  setTab(tab: 'packs' | 'plans'): void { this.activeTab.set(tab); }

  isCurrentPlan(planId: string): boolean {
    return this.mySub()?.active === true && this.mySub()?.plan?.id === planId;
  }

  askConfirmPack(pack: PointPack): void {
    if (!this.isAuth) { this.router.navigate(['/auth/login']); return; }
    this.confirmPack.set(pack);
  }

  askConfirmPlan(plan: SubscriptionPlan): void {
    if (!this.isAuth) { this.router.navigate(['/auth/login']); return; }
    this.confirmPlan.set(plan);
  }

  doPurchasePack(): void {
    const pack = this.confirmPack();
    if (!pack) return;
    this.purchasing.set(true);

    // Use Stripe Checkout for payment
    this.paymentService.createPackCheckout(pack.id).subscribe({
      next: (res) => {
        this.purchasing.set(false);
        this.confirmPack.set(null);
        // Redirect to Stripe-hosted checkout page
        window.location.href = res.checkoutUrl;
      },
      error: () => {
        this.purchasing.set(false);
        this.showToast('Erreur lors de la création du paiement', 'error');
      },
    });
  }

  doSubscribe(): void {
    const plan = this.confirmPlan();
    if (!plan) return;
    this.purchasing.set(true);
    this.offersService.subscribeToplan(plan.id).subscribe({
      next: (s) => {
        this.mySub.set(s);
        this.confirmPlan.set(null);
        this.purchasing.set(false);
        this.showToast(`Abonnement ${plan.name} activé !`, 'success');
      },
      error: () => { this.purchasing.set(false); this.showToast('Erreur abonnement', 'error'); },
    });
  }

  private showToast(text: string, type: 'success' | 'error'): void {
    this.toast.set({ text, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }

  packLabel(pack: PointPack): string {
    const labels: Record<string, string> = {
      DECOUVERTE: 'Découverte',
      POPULAIRE: 'Populaire',
      PRO: 'Pro',
    };
    return labels[pack.category] ?? pack.category;
  }

  isPopularPack(pack: PointPack): boolean {
    return pack.category === 'POPULAIRE' || pack.savingsPercent >= 20;
  }

  isPopularPlan(plan: SubscriptionPlan): boolean {
    return plan.name?.toLowerCase().includes('premium') || plan.name?.toLowerCase().includes('pro');
  }
}
