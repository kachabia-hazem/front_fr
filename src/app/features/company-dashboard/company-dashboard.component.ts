import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { CompanyDashboardService, CompanyDashboardStats } from '../../core/services/company-dashboard.service';
import { NotificationService } from '../../core/services/notification.service';
import { ContractService } from '../../core/services/contract.service';
import { ChatService } from '../../core/services/chat.service';
import { Company } from '../../core/models/user.model';
import { Contract } from '../../core/models/contract.model';
import { Notification as AppNotification, NotificationType } from '../../core/models/notification.model';
import { ChatConversation, ChatMessage } from '../../core/models/chat.model';
import { environment } from '../../../environments/environment';
import { ReportModalComponent } from '../../shared/report-modal/report-modal.component';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, TranslateModule, ReportModalComponent],
  templateUrl: './company-dashboard.component.html',
  styleUrl: './company-dashboard.component.css',
})
export class CompanyDashboardComponent implements OnInit, OnDestroy {
  company   = signal<Company | null>(null);
  stats     = signal<CompanyDashboardStats | null>(null);
  contracts = signal<Contract[]>([]);

  activeContractsCount = computed(() => this.contracts().filter(c => c.status === 'SIGNED').length);
  loading = signal(true);
  reportModalOpen = signal(false);
  sidebarCollapsed = signal(false);
  notifPanelOpen = signal(false);
  recentNotifications = computed(() => this.notificationService.notifications().slice(0, 8));
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  // Messaging panel
  msgPanelOpen = signal(false);
  selectedPanelConv = signal<ChatConversation | null>(null);
  panelMessages = signal<ChatMessage[]>([]);
  panelMsgText = '';
  panelLoading = signal(false);
  panelSending = false;
  unreadMsgCount = computed(() => this.chatService.totalUnread());

  companyName = computed(() => this.company()?.companyName || 'Company');
  managerName = computed(() => {
    const c = this.company();
    return c?.managerName || '';
  });
  managerPosition = computed(() => this.company()?.managerPosition || 'Manager');
  managerInitials = computed(() => {
    const name = this.managerName();
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    return parts.map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  });
  companyInitials = computed(() => {
    const name = this.companyName();
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    return parts.map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  });

  // Line chart: Missions per month
  missionsPerMonthCurve = computed(() => {
    const s = this.stats();
    if (!s || s.missionsPerMonth.length === 0) return '';
    return this.buildSmoothCurve(s.missionsPerMonth, 400, 160);
  });
  missionsPerMonthArea = computed(() => {
    const s = this.stats();
    if (!s || s.missionsPerMonth.length === 0) return '';
    return this.buildSmoothArea(s.missionsPerMonth, 400, 160);
  });
  maxMissionsPerMonth = computed(() => {
    const s = this.stats();
    if (!s) return 1;
    return Math.max(...s.missionsPerMonth, 1);
  });

  // Line chart: Applications per mission
  appsPerMissionCurve = computed(() => {
    const s = this.stats();
    if (!s || s.applicationsPerMission.length === 0) return '';
    const data = s.applicationsPerMission.map(a => a.count);
    return this.buildSmoothCurve(data, 400, 160);
  });
  appsPerMissionArea = computed(() => {
    const s = this.stats();
    if (!s || s.applicationsPerMission.length === 0) return '';
    const data = s.applicationsPerMission.map(a => a.count);
    return this.buildSmoothArea(data, 400, 160);
  });
  maxAppsPerMission = computed(() => {
    const s = this.stats();
    if (!s || s.applicationsPerMission.length === 0) return 1;
    return Math.max(...s.applicationsPerMission.map(a => a.count), 1);
  });

  // Donut chart: Missions by status
  donutSegments = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const total = s.totalMissions || 1;
    const colors: { [key: string]: string } = {
      OPEN: '#3793B0',
      IN_PROGRESS: '#3b82f6',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444',
      CLOSED: '#6b7280',
    };
    const labels: { [key: string]: string } = {
      OPEN: 'Open',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      CLOSED: 'Closed',
    };
    let offset = 0;
    const circumference = 2 * Math.PI * 45; // r=45
    return Object.entries(s.missionsByStatus)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => {
        const pct = count / total;
        const dash = pct * circumference;
        const segment = {
          status,
          label: labels[status] || status,
          count,
          pct: Math.round(pct * 100),
          color: colors[status] || '#6b7280',
          dashArray: `${dash} ${circumference - dash}`,
          dashOffset: -offset,
        };
        offset += dash;
        return segment;
      });
  });

  // Bar chart: Monthly spending
  maxSpending = computed(() => {
    const s = this.stats();
    if (!s) return 1;
    return Math.max(...s.monthlySpending, 1);
  });

  constructor(
    private companyService: CompanyService,
    private companyDashboardService: CompanyDashboardService,
    private notificationService: NotificationService,
    private contractService: ContractService,
    public chatService: ChatService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  goBack(): void { this.router.navigate(['/']); }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.companyService.getMyProfile().subscribe({
      next: (profile) => this.company.set(profile),
    });

    this.companyDashboardService.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.contractService.getCompanyContracts().subscribe({
      next: list => this.contracts.set(list),
    });
    this.notificationService.getUnreadCount().subscribe();
    this.notificationService.getMyNotifications().subscribe();
    this.chatService.getConversations().subscribe();
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
    return conv.freelancerName;
  }

  getPanelContactAvatar(conv: ChatConversation): string | undefined {
    return conv.freelancerPicture;
  }

  getPanelContactInitials(name: string): string {
    return name.split(' ').map((w: string) => w.charAt(0)).join('').substring(0, 2).toUpperCase();
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
    this.router.navigate(['/company-notifications'], { queryParams: { id: notif.id } });
  }

  markAllNotifsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  getNotifTypeIcon(type: NotificationType | string): string {
    const icons: Record<string, string> = {
      COMPANY_WELCOME: '🏢',
      MISSION_PUBLISHED: '📋',
      APPLICATION_RECEIVED: '📥',
      PENDING_APPLICATIONS_REMINDER: '⏰',
      MISSION_CLOSED: '🔒',
      WELCOME: '👋',
      APPLICATION_SUBMITTED: '📤',
      APPLICATION_ACCEPTED: '✅',
      APPLICATION_REJECTED: '❌',
      APPLICATION_WITHDRAWN: '↩️',
      NEW_MISSION_MATCH: '🎯',
      MISSION_DEADLINE_SOON: '⚠️',
      PROFILE_INCOMPLETE: '⚠️',
    };
    return icons[type] || '🔔';
  }

  getNotifTypeColor(type: NotificationType | string): string {
    const colors: Record<string, string> = {
      COMPANY_WELCOME: 'green',
      MISSION_PUBLISHED: 'blue',
      APPLICATION_RECEIVED: 'purple',
      PENDING_APPLICATIONS_REMINDER: 'amber',
      MISSION_CLOSED: 'gray',
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

  private langSub?: Subscription;

  heroSearch = '';
  heroSkill = '';

  onFreelancerSearch(): void {
    const queryParams: Record<string, string> = {};
    if (this.heroSearch.trim()) queryParams['search'] = this.heroSearch.trim();
    if (this.heroSkill.trim()) queryParams['skill'] = this.heroSkill.trim();
    this.router.navigate(['/company/freelancers'], { queryParams });
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  get companyLogo(): string | undefined {
    return this.company()?.companyLogo;
  }

  getBarHeight(value: number): number {
    const max = this.maxSpending();
    return Math.max((value / max) * 100, 4);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  truncateTitle(title: string, maxLen = 12): string {
    return title.length > maxLen ? title.substring(0, maxLen) + '...' : title;
  }

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
