import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FreelancerService } from '../../core/services/freelancer.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { OffersService, BalanceResponse, TransactionItem } from '../../core/services/offers.service';
import { PaymentService } from '../../core/services/payment.service';
import { FreelancerPaymentSummary } from '../../core/models/payment.model';
import { Freelancer } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-freelancer-transactions',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './freelancer-transactions.component.html',
  styleUrl: './freelancer-transactions.component.css',
})
export class FreelancerTransactionsComponent implements OnInit {
  freelancer       = signal<Freelancer | null>(null);
  loading          = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  balance          = signal<BalanceResponse | null>(null);
  paymentSummary   = signal<FreelancerPaymentSummary | null>(null);
  pointTransactions = computed(() => this.balance()?.transactions ?? []);
  pointsBalance    = computed(() => this.balance()?.pointsBalance ?? 0);

  tab = signal<'points' | 'contracts'>('points');

  initials = computed(() => {
    const f = this.freelancer();
    if (!f) return '?';
    return ((f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')).toUpperCase();
  });
  displayName = computed(() => {
    const f = this.freelancer();
    if (!f) return '';
    return `${f.firstName || ''} ${f.lastName || ''}`.trim();
  });
  currentPosition = computed(() => this.freelancer()?.currentPosition || 'Freelancer');

  constructor(
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    private offersService: OffersService,
    private paymentService: PaymentService,
    public  authService: AuthService,
    public  themeService: ThemeService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (p) => { this.freelancer.set(p); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.notificationService.getUnreadCount().subscribe();
    this.offersService.getMyBalance().subscribe({ next: (b) => this.balance.set(b) });
    this.paymentService.getFreelancerPaymentSummary().subscribe({ next: (s) => this.paymentSummary.set(s), error: () => {} });
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  get profilePicture(): string | undefined { return this.freelancer()?.profilePicture; }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  txTypeLabel(type: string): string {
    const map: Record<string, string> = {
      PURCHASE_PACK:  'transactions.type_purchase_pack',
      SUBSCRIBE_PLAN: 'transactions.type_subscribe_plan',
      APPLICATION:    'transactions.type_application',
      AI_MATCHING:    'transactions.type_ai_matching',
      BOOST:          'transactions.type_boost',
      FEATURED:       'transactions.type_featured',
    };
    return map[type] ?? type;
  }

  txTypeClass(type: string): string {
    const map: Record<string, string> = {
      PURCHASE_PACK:  'tx-pack',
      SUBSCRIBE_PLAN: 'tx-sub',
      APPLICATION:    'tx-app',
      AI_MATCHING:    'tx-ai',
      BOOST:          'tx-boost',
      FEATURED:       'tx-featured',
    };
    return map[type] ?? 'tx-pack';
  }

  paymentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'transactions.status_escrow',
      CAPTURED:   'transactions.status_earned',
      FAILED:     'transactions.status_failed',
      REFUNDED:   'transactions.status_refunded',
      UNPAID:     'transactions.status_unpaid',
    };
    return map[status] ?? status;
  }

  paymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'badge-escrow', CAPTURED: 'badge-captured',
      FAILED: 'badge-failed',     REFUNDED: 'badge-refunded', UNPAID: 'badge-unpaid',
    };
    return map[status] ?? 'badge-unpaid';
  }
}
