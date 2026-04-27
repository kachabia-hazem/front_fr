import { TranslateModule } from '@ngx-translate/core';
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FreelancerService } from '../../core/services/freelancer.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { OffersService, BalanceResponse, TransactionItem } from '../../core/services/offers.service';
import { Freelancer } from '../../core/models';
import { environment } from '../../../environments/environment';

interface ChartPoint { x: number; y: number; balance: number; label: string; }

@Component({
  selector: 'app-freelancer-balance',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './freelancer-balance.component.html',
  styleUrl: './freelancer-balance.component.css',
})
export class FreelancerBalanceComponent implements OnInit {
  freelancer    = signal<Freelancer | null>(null);
  loading       = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  balance      = signal<BalanceResponse | null>(null);
  pointsBalance = computed(() => this.balance()?.pointsBalance ?? 0);
  transactions  = computed(() => this.balance()?.transactions ?? []);

  // ── Analytics ─────────────────────────────────────────────────────────────
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

  // Chart: walking balance over last N transactions (oldest→newest)
  chartPoints = computed((): ChartPoint[] => {
    const txs = [...this.transactions()].reverse(); // chronological order
    if (txs.length === 0) return [];
    const take = txs.slice(-12);
    let running = this.pointsBalance();
    // rebuild from current balance going backwards, then re-reverse for chart
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

  initials = computed(() => {
    const f = this.freelancer();
    if (!f) return '?';
    return ((f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')).toUpperCase();
  });
  displayName    = computed(() => {
    const f = this.freelancer();
    if (!f) return '';
    return `${f.firstName || ''} ${f.lastName || ''}`.trim();
  });
  currentPosition = computed(() => this.freelancer()?.currentPosition || 'Freelancer');

  constructor(
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    private offersService: OffersService,
    public  authService: AuthService,
    public  themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (p) => { this.freelancer.set(p); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.notificationService.getUnreadCount().subscribe();
    this.offersService.getMyBalance().subscribe({ next: (b) => this.balance.set(b) });
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  get profilePicture(): string | undefined { return this.freelancer()?.profilePicture; }

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }


  formatDate(d: string): string {
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
}
