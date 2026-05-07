import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import {
  OffersService,
  SubscriptionPlan,
  CompanySubscriptionResponse,
} from '../../core/services/offers.service';
import { Company } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-company-subscription',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './company-subscription.component.html',
  styleUrl: './company-subscription.component.css',
})
export class CompanySubscriptionComponent implements OnInit, OnDestroy{
  company = signal<Company | null>(null);
  loading = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  // Subscription data
  subscription = signal<CompanySubscriptionResponse | null>(null);
  catalogPlans = signal<SubscriptionPlan[]>([]);
  catalogLoading = signal(false);

  // UI
  subscribingId = signal<string | null>(null);
  confirmPlanId = signal<string | null>(null);
  confirmPlan = computed(() => this.catalogPlans().find(p => p.id === this.confirmPlanId()) ?? null);
  toast = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  companyName    = computed(() => this.company()?.companyName || 'Company');
  companyInitials = computed(() => {
    const n = this.company()?.companyName || '';
    return n.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  });

  get companyLogo(): string | undefined {
    return this.company()?.companyLogo;
  }

  private langSub?: Subscription;

    constructor(
  private companyService: CompanyService,
    private notificationService: NotificationService,
    private offersService: OffersService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.companyService.getMyProfile().subscribe({
      next: (c) => { this.company.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.notificationService.getUnreadCount().subscribe();
    this.loadSubscription();
    this.loadCatalog();
  }

  loadSubscription(): void {
    this.offersService.getMySubscription().subscribe({
      next: (s) => this.subscription.set(s),
    });
  }

  loadCatalog(): void {
    this.catalogLoading.set(true);
    this.offersService.getCatalogSubscriptions().subscribe({
      next: (plans) => { this.catalogPlans.set(plans); this.catalogLoading.set(false); },
      error: () => this.catalogLoading.set(false),
    });
  }

  isCurrentPlan(planId: string): boolean {
    return this.subscription()?.active === true && this.subscription()?.plan?.id === planId;
  }

  openConfirm(plan: SubscriptionPlan): void {
    this.confirmPlanId.set(plan.id);
  }

  confirmSubscribe(): void {
    const plan = this.confirmPlan();
    if (!plan) return;
    this.confirmPlanId.set(null);
    this.subscribingId.set(plan.id);
    this.offersService.subscribeToplan(plan.id).subscribe({
      next: (s) => {
        this.subscription.set(s);
        this.subscribingId.set(null);
        this.showToast(`Abonnement ${plan.name} activé !`, 'success');
      },
      error: () => {
        this.subscribingId.set(null);
        this.showToast('Erreur lors de l\'abonnement', 'error');
      },
    });
  }

  private showToast(text: string, type: 'success' | 'error'): void {
    this.toast.set({ text, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    return environment.apiUrl.replace(/\/api$/, '') + relativePath;
  }

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  daysLeft(): number {
    const sub = this.subscription();
    if (!sub?.active || !sub.expiresAt) return 0;
    const diff = new Date(sub.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
