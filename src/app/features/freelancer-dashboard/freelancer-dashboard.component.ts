import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { ApplicationService } from '../../core/services/application.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Freelancer } from '../../core/models';
import { Application } from '../../core/models/application.model';
import { Notification as AppNotification, NotificationType } from '../../core/models/notification.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-freelancer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './freelancer-dashboard.component.html',
  styleUrl: './freelancer-dashboard.component.css',
})
export class FreelancerDashboardComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  stats = signal<DashboardStats | null>(null);
  applications = signal<Application[]>([]);
  loading = signal(true);
  unreadNotifCount = signal(0);

  sidebarCollapsed = signal(false);
  notifPanelOpen = signal(false);
  recentNotifications = signal<AppNotification[]>([]);

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

  recentApplications = computed(() => {
    return this.applications()
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5);
  });

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

  // SVG curve path for visibility (mock data for now)
  visibilityCurvePath = computed(() => {
    const mockData = [0, 0, 0, 0, 0, 0];
    return this.buildSmoothCurve(mockData, 400, 160);
  });

  visibilityAreaPath = computed(() => {
    const mockData = [0, 0, 0, 0, 0, 0];
    return this.buildSmoothArea(mockData, 400, 160);
  });

  constructor(
    private dashboardService: DashboardService,
    private freelancerService: FreelancerService,
    private applicationService: ApplicationService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => this.freelancer.set(profile),
    });

    this.applicationService.getMyApplications().subscribe({
      next: (apps) => this.applications.set(apps),
    });

    this.dashboardService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.notificationService.getUnreadCount().subscribe({
      next: (res) => this.unreadNotifCount.set(res.count),
    });

    this.notificationService.getMyNotifications().subscribe({
      next: (list) => this.recentNotifications.set(list.slice(0, 8)),
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleNotifPanel(): void {
    this.notifPanelOpen.update(v => !v);
  }

  closeNotifPanel(): void {
    this.notifPanelOpen.set(false);
  }

  openNotifDetail(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe({
        next: () => {
          this.recentNotifications.update(list =>
            list.map(n => n.id === notif.id ? { ...n, isRead: true } : n),
          );
          this.unreadNotifCount.update(c => Math.max(0, c - 1));
        },
      });
    }
    this.notifPanelOpen.set(false);
    this.router.navigate(['/freelancer-notifications'], { queryParams: { id: notif.id } });
  }

  markAllNotifsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.recentNotifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.unreadNotifCount.set(0);
      },
    });
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

  goBack(): void {
    this.router.navigate(['/dashboard']);
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
