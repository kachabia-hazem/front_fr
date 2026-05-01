import { TranslateModule } from '@ngx-translate/core';
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { ApplicationService } from '../../core/services/application.service';
import { NotificationService } from '../../core/services/notification.service';
import { ContractService } from '../../core/services/contract.service';
import { ActiveMissionService } from '../../core/services/active-mission.service';
import { PaymentService } from '../../core/services/payment.service';
import { FreelancerPaymentSummary } from '../../core/models/payment.model';
import { ChatService } from '../../core/services/chat.service';
import { Contract } from '../../core/models/contract.model';
import { ActiveMission } from '../../core/models/active-mission.model';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Freelancer } from '../../core/models';
import { Application } from '../../core/models/application.model';
import { Notification as AppNotification, NotificationType } from '../../core/models/notification.model';
import { ChatConversation, ChatMessage } from '../../core/models/chat.model';
import { environment } from '../../../environments/environment';
import { ReportModalComponent } from '../../shared/report-modal/report-modal.component';

@Component({
  selector: 'app-freelancer-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, RouterLink, RouterLinkActive, TranslateModule, ReportModalComponent],
  templateUrl: './freelancer-dashboard.component.html',
  styleUrl: './freelancer-dashboard.component.css',
})
export class FreelancerDashboardComponent implements OnInit {
  freelancer  = signal<Freelancer | null>(null);
  stats       = signal<DashboardStats | null>(null);
  applications = signal<Application[]>([]);
  contracts   = signal<Contract[]>([]);
  activeMissions = signal<ActiveMission[]>([]);

  activeContractsCount = computed(() => this.contracts().filter(c => c.status === 'SIGNED').length);
  activeMissionsCount = computed(() => this.activeMissions().filter(m => m.status === 'ACTIVE').length);
  loading = signal(true);
  reportModalOpen = signal(false);

  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  // Messaging panel
  msgPanelOpen = signal(false);
  selectedPanelConv = signal<ChatConversation | null>(null);
  panelMessages = signal<ChatMessage[]>([]);
  panelMsgText = '';
  panelLoading = signal(false);
  panelSending = false;
  unreadMsgCount = computed(() => this.chatService.totalUnread());

  sidebarCollapsed = signal(false);
  notifPanelOpen = signal(false);
  recentNotifications = computed(() => this.notificationService.notifications().slice(0, 8));

  // Which card's chart is expanded: null, 'turnover', or 'visibility'
  expandedCard = signal<'turnover' | 'visibility' | null>(null);

  firstName = computed(() => this.freelancer()?.firstName || 'Freelancer');
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

  maxRevenue = computed(() => {
    const s = this.stats();
    if (!s) return 1;
    return Math.max(...s.monthlyRevenue, 1);
  });

  readonly PAGE_SIZE = 5;

  // All applications sorted by date (no slice — pagination handles display)
  sortedApplications = computed(() =>
    this.applications()
      .slice()
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  );

  // Applications pagination
  appPage = signal(0);
  appTotalPages = computed(() => Math.max(1, Math.ceil(this.sortedApplications().length / this.PAGE_SIZE)));
  pagedApplications = computed(() => {
    const start = this.appPage() * this.PAGE_SIZE;
    return this.sortedApplications().slice(start, start + this.PAGE_SIZE);
  });

  // Contracts pagination (payment section)
  signedContracts = computed(() =>
    this.contracts().filter(c => c.status === 'SIGNED' && c.salary != null && c.startDate && c.endDate)
  );
  contractPage = signal(0);
  contractTotalPages = computed(() => Math.max(1, Math.ceil(this.signedContracts().length / this.PAGE_SIZE)));
  pagedContracts = computed(() => {
    const start = this.contractPage() * this.PAGE_SIZE;
    return this.signedContracts().slice(start, start + this.PAGE_SIZE);
  });

  // Keep alias for backward-compat with any template reference
  recentApplications = this.sortedApplications;


  // SVG curve path for turnover chart
  turnoverCurvePath = computed(() => {
    const s = this.stats();
    if (!s || s.monthlyRevenue.length === 0) return '';
    return this.buildSmoothCurve(s.monthlyRevenue, 400, 160);
  });

  turnoverAreaPath = computed(() => {
    const s = this.stats();
    if (!s || s.monthlyRevenue.length === 0) return '';
    return this.buildSmoothArea(s.monthlyRevenue, 400, 160);
  });

  // SVG curve path for visibility (real data)
  visibilityData = computed(() => {
    const s = this.stats();
    const total = (s?.visibility?.views || 0) + (s?.visibility?.appearances || 0);
    return [0, 0, 0, 0, 0, total];
  });

  maxVisibility = computed(() => Math.max(...this.visibilityData(), 1));

  visibilityYLabels = computed(() => {
    const max = this.maxVisibility();
    return [
      { value: Math.round(max * 0.875), topPct: 21.875 },
      { value: Math.round(max * 0.583), topPct: 43.75 },
      { value: Math.round(max * 0.292), topPct: 65.625 },
      { value: 0, topPct: 87.5 },
    ];
  });

  visibilityCurvePath = computed(() => this.buildSmoothCurve(this.visibilityData(), 400, 160));

  visibilityAreaPath = computed(() => this.buildSmoothArea(this.visibilityData(), 400, 160));

  // ─── Payment Schedule Chart ───────────────────────────────────────────────

  paymentScheduleWeeks = computed(() => {
    const signedContracts = this.signedContracts();
    if (signedContracts.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Monday of current week
    const currentMonday = new Date(today);
    const dow = today.getDay();
    currentMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

    const weeks: { label: string; amount: number }[] = [];

    for (let w = 0; w < 8; w++) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4); // Friday

      let weekAmount = 0;

      for (const contract of signedContracts) {
        const cStart = new Date(contract.startDate!);
        const cEnd   = new Date(contract.endDate!);
        cStart.setHours(0, 0, 0, 0);
        cEnd.setHours(0, 0, 0, 0);

        const overlapStart = weekStart > cStart ? weekStart : cStart;
        const overlapEnd   = weekEnd   < cEnd   ? weekEnd   : cEnd;

        if (overlapStart <= overlapEnd) {
          weekAmount += contract.salary! * this.countWorkdays(overlapStart, overlapEnd);
        }
      }

      let label: string;
      if (w === 0)      label = 'This week';
      else if (w === 1) label = 'Next week';
      else {
        const m = weekStart.toLocaleDateString('en-US', { month: 'short' });
        label = `${m} ${weekStart.getDate()}`;
      }
      weeks.push({ label, amount: weekAmount });
    }
    return weeks;
  });

  paymentChartData   = computed(() => this.paymentScheduleWeeks().map(w => w.amount));
  paymentChartLabels = computed(() => this.paymentScheduleWeeks().map(w => w.label));
  maxWeekPayment     = computed(() => Math.max(...this.paymentChartData(), 1));

  paymentYLabels = computed(() => {
    const max = this.maxWeekPayment();
    return [
      { label: this.formatCompact(max),        topPct: 12.5 },
      { label: this.formatCompact(max * 0.67), topPct: 37.5 },
      { label: this.formatCompact(max * 0.33), topPct: 62.5 },
      { label: '0',                            topPct: 87.5 },
    ];
  });

  paymentCurvePath = computed(() => {
    const d = this.paymentChartData();
    return d.length >= 2 ? this.buildSmoothCurve(d, 400, 160) : '';
  });

  paymentAreaPath = computed(() => {
    const d = this.paymentChartData();
    return d.length >= 2 ? this.buildSmoothArea(d, 400, 160) : '';
  });

  thisWeekPayment    = computed(() => this.paymentScheduleWeeks()[0]?.amount ?? 0);
  nextWeekPayment    = computed(() => this.paymentScheduleWeeks()[1]?.amount ?? 0);

  totalRemainingValue = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.contracts()
      .filter(c => c.status === 'SIGNED' && c.salary != null && c.endDate)
      .reduce((sum, c) => {
        const cEnd   = new Date(c.endDate!);
        const cStart = c.startDate ? new Date(c.startDate) : today;
        const effectiveStart = cStart > today ? cStart : today;
        cEnd.setHours(0, 0, 0, 0);
        effectiveStart.setHours(0, 0, 0, 0);
        if (effectiveStart > cEnd) return sum;
        return sum + c.salary! * this.countWorkdays(effectiveStart, cEnd);
      }, 0);
  });

  hasPaymentData = computed(() => this.paymentChartData().some(v => v > 0));

  expandedPaymentChart = signal(false);
  togglePaymentChart(): void { this.expandedPaymentChart.update(v => !v); }

  // ─── Stripe Payment Summary ───────────────────────────────────────────────
  paymentSummary = signal<FreelancerPaymentSummary | null>(null);
  paymentLoading = signal(true);

  constructor(
    private dashboardService: DashboardService,
    private freelancerService: FreelancerService,
    private applicationService: ApplicationService,
    private notificationService: NotificationService,
    private contractService: ContractService,
    private activeMissionService: ActiveMissionService,
    private paymentService: PaymentService,
    public chatService: ChatService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
  ) {}

  goBack(): void { this.router.navigate(['/']); }

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => this.freelancer.set(profile),
    });

    this.applicationService.getMyApplications().subscribe({
      next: (apps) => this.applications.set(apps),
    });

    this.contractService.getFreelancerContracts().subscribe({
      next: (list) => this.contracts.set(list),
    });

    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.activeMissionService.getFreelancerMissions().subscribe({
      next: (missions) => this.activeMissions.set(missions),
    });

    this.notificationService.getUnreadCount().subscribe();

    this.notificationService.getMyNotifications().subscribe();

    this.chatService.getConversations().subscribe();

    this.paymentService.getFreelancerPaymentSummary().subscribe({
      next: (s) => { this.paymentSummary.set(s); this.paymentLoading.set(false); },
      error: () => { this.paymentLoading.set(false); },
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleNotifPanel(): void {
    this.notifPanelOpen.update(v => !v);
    if (this.notifPanelOpen()) this.msgPanelOpen.set(false);
  }

  closeNotifPanel(): void {
    this.notifPanelOpen.set(false);
  }

  toggleMsgPanel(): void {
    this.msgPanelOpen.update(v => !v);
    if (this.msgPanelOpen()) {
      this.notifPanelOpen.set(false);
      this.selectedPanelConv.set(null);
      this.chatService.getConversations().subscribe();
    }
  }

  closeMsgPanel(): void {
    this.msgPanelOpen.set(false);
    this.selectedPanelConv.set(null);
  }


  openPanelConversation(conv: ChatConversation): void {
    this.selectedPanelConv.set(conv);
    this.panelLoading.set(true);
    this.chatService.getMessages(conv.id).subscribe({
      next: (msgs) => {
        this.panelMessages.set(msgs);
        this.panelLoading.set(false);
        this.chatService.markRead(conv.id).subscribe({ error: () => {} });
        // Reset unread count locally
        this.chatService.conversations.update(convs =>
          convs.map(c => c.id === conv.id ? { ...c, unreadCount: { ...c.unreadCount, [this.authService.currentUser()?.id ?? '']: 0 } } : c)
        );
      },
      error: () => this.panelLoading.set(false),
    });
  }

  backToPanelList(): void {
    this.selectedPanelConv.set(null);
  }

  sendPanelMessage(): void {
    const conv = this.selectedPanelConv();
    const content = this.panelMsgText.trim();
    if (!conv || !content || this.panelSending) return;
    this.panelSending = true;
    this.panelMsgText = '';
    this.chatService.sendMessage(conv.id, content).subscribe({
      next: (msg) => {
        this.panelMessages.update(msgs => [...msgs, msg]);
        this.panelSending = false;
      },
      error: () => {
        this.panelSending = false;
        this.panelMsgText = content;
      },
    });
  }

  onPanelKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPanelMessage();
    }
  }

  getPanelContactName(conv: ChatConversation): string {
    return conv.companyName;
  }

  getPanelContactAvatar(conv: ChatConversation): string | undefined {
    return conv.companyLogo;
  }

  getPanelContactInitials(name: string): string {
    return name.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  getPanelUnread(conv: ChatConversation): number {
    return conv.unreadCount[this.authService.currentUser()?.id ?? ''] ?? 0;
  }

  formatPanelTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  getFileUrlPanel(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace('/api', '') + path;
  }

  openNotifDetail(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe();
    }
    this.notifPanelOpen.set(false);
    this.router.navigate(['/freelancer-notifications'], { queryParams: { id: notif.id } });
  }

  markAllNotifsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  getNotifTypeIcon(type: NotificationType | string): string {
    const icons: Record<string, string> = {
      WELCOME: '👋',
      APPLICATION_SUBMITTED: '📤',
      APPLICATION_ACCEPTED: '✅',
      APPLICATION_REJECTED: '❌',
      APPLICATION_WITHDRAWN: '↩️',
      NEW_MISSION_MATCH: '🎯',
      MISSION_DEADLINE_SOON: '⏰',
      PROFILE_INCOMPLETE: '⚠️',
    };
    return icons[type] || '🔔';
  }

  getNotifTypeColor(type: NotificationType | string): string {
    const colors: Record<string, string> = {
      WELCOME: 'green',
      APPLICATION_SUBMITTED: 'blue',
      APPLICATION_ACCEPTED: 'emerald',
      APPLICATION_REJECTED: 'red',
      APPLICATION_WITHDRAWN: 'orange',
      NEW_MISSION_MATCH: 'purple',
      MISSION_DEADLINE_SOON: 'amber',
      PROFILE_INCOMPLETE: 'yellow',
    };
    return colors[type] || 'gray';
  }

  formatNotifTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  toggleChart(card: 'turnover' | 'visibility'): void {
    this.expandedCard.update(current => current === card ? null : card);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  getBarHeight(value: number): number {
    const max = this.maxRevenue();
    return Math.max((value / max) * 100, 4);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  get profilePicture(): string | undefined {
    return this.freelancer()?.profilePicture;
  }

  appPrevPage(): void      { this.appPage.update(p => Math.max(0, p - 1)); }
  appNextPage(): void      { this.appPage.update(p => Math.min(this.appTotalPages() - 1, p + 1)); }
  contractPrevPage(): void { this.contractPage.update(p => Math.max(0, p - 1)); }
  contractNextPage(): void { this.contractPage.update(p => Math.min(this.contractTotalPages() - 1, p + 1)); }

  formatTND(amount: number | null | undefined): string {
    if (amount == null) return '0,000 DT';
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }

  paymentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      UNPAID:     'dashboard.payment_status_unpaid',
      AUTHORIZED: 'dashboard.payment_status_escrow',
      CAPTURED:   'dashboard.payment_status_earned',
      FAILED:     'dashboard.payment_status_failed',
      REFUNDED:   'dashboard.payment_status_refunded',
    };
    return map[status] ?? status;
  }

  paymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'ps-escrow',
      CAPTURED:   'ps-earned',
      FAILED:     'ps-failed',
      REFUNDED:   'ps-refunded',
      UNPAID:     'ps-unpaid',
    };
    return map[status] ?? 'ps-unpaid';
  }

  private formatCompact(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return Math.round(value).toString();
  }

  private countWorkdays(start: Date, end: Date): number {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // Build a smooth cubic bezier curve SVG path
  private buildSmoothCurve(data: number[], width: number, height: number): string {
    if (data.length < 2) return '';
    const max = Math.max(...data, 1);
    const padding = 20;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - (v / max) * h,
    }));

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
      path += ` C ${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
    }
    return path;
  }

  // Build area fill under the curve
  private buildSmoothArea(data: number[], width: number, height: number): string {
    const curvePath = this.buildSmoothCurve(data, width, height);
    if (!curvePath) return '';
    const padding = 20;
    const w = width - padding * 2;
    const bottomY = height - padding;
    const lastX = padding + w;
    return `${curvePath} L ${lastX},${bottomY} L ${padding},${bottomY} Z`;
  }
}
