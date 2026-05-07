import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { OffersService, BalanceResponse, TransactionItem, CompanySubscriptionResponse } from '../../core/services/offers.service';
import { Company } from '../../core/models';
import { environment } from '../../../environments/environment';

interface ChartPoint { x: number; y: number; balance: number; label: string; }

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-company-balance',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './company-balance.component.html',
  styleUrl: './company-balance.component.css',
})
export class CompanyBalanceComponent implements OnInit, OnDestroy{
  company          = signal<Company | null>(null);
  loading          = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  balance      = signal<BalanceResponse | null>(null);
  subscription = signal<CompanySubscriptionResponse | null>(null);

  pointsBalance = computed(() => this.balance()?.pointsBalance ?? 0);
  transactions  = computed(() => this.balance()?.transactions ?? []);

  // ── Analytics ──────────────────────────────────────────────────────────────
  totalCredited = computed(() =>
    this.transactions().filter(t => t.points > 0).reduce((s, t) => s + t.points, 0)
  );
  totalDebited = computed(() =>
    Math.abs(this.transactions().filter(t => t.points < 0).reduce((s, t) => s + t.points, 0))
  );
  totalSpentTND = computed(() =>
    this.transactions().filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  );
  lastActivityDate = computed(() => {
    const txs = this.transactions();
    return txs.length > 0 ? this.formatDate(txs[0].createdAt) : '—';
  });

  // Count by type
  creditCount = computed(() => this.transactions().filter(t => t.points > 0).length);
  debitCount  = computed(() => this.transactions().filter(t => t.points < 0).length);

  // Subscription helpers
  isSubActive   = computed(() => this.subscription()?.active === true);
  subPlanName   = computed(() => this.subscription()?.plan?.name ?? '—');
  subExpires    = computed(() => {
    const e = this.subscription()?.expiresAt;
    return e ? this.formatDate(e) : '—';
  });
  daysLeft = computed(() => {
    const e = this.subscription()?.expiresAt;
    if (!e) return 0;
    return Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000));
  });

  cancelling     = signal(false);
  cancelToast    = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // Chart: walking balance
  chartPoints = computed((): ChartPoint[] => {
    const reversed = [...this.transactions()].slice(0, 12);
    const points: { balance: number; label: string }[] = [];
    let bal = this.pointsBalance();
    for (const tx of reversed) {
      points.push({ balance: bal, label: this.shortDate(tx.createdAt) });
      bal -= tx.points;
    }
    points.reverse();
    if (points.length === 0) return [];
    const maxBal = Math.max(...points.map(p => p.balance), 1);
    const minBal = Math.min(...points.map(p => p.balance), 0);
    const range  = maxBal - minBal || 1;
    const W = 560; const H = 140; const PAD = 16;
    return points.map((p, i) => ({
      x: PAD + (i / Math.max(points.length - 1, 1)) * (W - PAD * 2),
      y: H - PAD - ((p.balance - minBal) / range) * (H - PAD * 2),
      balance: p.balance,
      label: p.label,
    }));
  });

  chartPath = computed((): string => {
    const pts = this.chartPoints();
    if (pts.length < 2) return '';
    return pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  });

  chartArea = computed((): string => {
    const pts = this.chartPoints();
    if (pts.length < 2) return '';
    const H = 140; const PAD = 16;
    const first = pts[0]; const last = pts[pts.length - 1];
    return `${this.chartPath()} L${last.x},${H - PAD} L${first.x},${H - PAD} Z`;
  });

  // Type breakdown chart (donut-like bar)
  typeBreakdown = computed(() => {
    const txs = this.transactions();
    const total = txs.length || 1;
    const map: Record<string, number> = {};
    for (const tx of txs) map[tx.type] = (map[tx.type] ?? 0) + 1;
    return Object.entries(map).map(([type, count]) => ({
      type,
      count,
      pct: Math.round((count / total) * 100),
      label: this.txLabel(type),
      color: this.txTypeColor(type),
    }));
  });

  companyName    = computed(() => this.company()?.companyName || 'Entreprise');
  companyInitials = computed(() => {
    const n = this.company()?.companyName || '';
    return n.split(' ').map((w: string) => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  });
  get companyLogo(): string | undefined { return this.company()?.companyLogo; }

  private langSub?: Subscription;

    constructor(
  private companyService: CompanyService,
    private notificationService: NotificationService,
    private offersService: OffersService,
    public  authService: AuthService,
    public  themeService: ThemeService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.companyService.getMyProfile().subscribe({
      next: (c) => { this.company.set(c); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.notificationService.getUnreadCount().subscribe();
    this.offersService.getMyCompanyBalance().subscribe({ next: (b) => this.balance.set(b) });
    this.offersService.getMySubscription().subscribe({ next: (s) => this.subscription.set(s) });
  }

  cancelSubscription(): void {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    this.offersService.cancelSubscription().subscribe({
      next: (s) => {
        this.subscription.set(s);
        this.cancelling.set(false);
        this.cancelToast.set({ text: this.translate.instant('balance.cancel_success'), type: 'success' });
        setTimeout(() => this.cancelToast.set(null), 3500);
      },
      error: () => {
        this.cancelling.set(false);
        this.cancelToast.set({ text: this.translate.instant('balance.cancel_error'), type: 'error' });
        setTimeout(() => this.cancelToast.set(null), 3500);
      },
    });
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }
  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  private shortDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  txIcon(type: string): string {
    const map: Record<string, string> = {
      PURCHASE_PACK:  'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
      SUBSCRIBE_PLAN: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
      APPLICATION:    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
      AI_MATCHING:    'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm3-8a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
      BOOST:          'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      FEATURED:       'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    };
    return map[type] ?? 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
  }

  txColorClass(type: string): string {
    return type === 'PURCHASE_PACK' || type === 'SUBSCRIBE_PLAN' ? 'credit' : 'debit';
  }

  txIconClass(type: string): string {
    const map: Record<string, string> = {
      PURCHASE_PACK:  'icon-purchase',
      SUBSCRIBE_PLAN: 'icon-sub',
      APPLICATION:    'icon-application',
      AI_MATCHING:    'icon-ai',
      BOOST:          'icon-boost',
      FEATURED:       'icon-featured',
    };
    return map[type] ?? 'icon-purchase';
  }

  txLabel(type: string): string {
    return 'balance.tx_' + type;
  }

  txTypeColor(type: string): string {
    const map: Record<string, string> = {
      PURCHASE_PACK:  '#3793B0',
      SUBSCRIBE_PLAN: '#1a6480',
      APPLICATION:    '#f59e0b',
      AI_MATCHING:    '#06b6d4',
      BOOST:          '#f97316',
      FEATURED:       '#ec4899',
    };
    return map[type] ?? '#6b7280';
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
