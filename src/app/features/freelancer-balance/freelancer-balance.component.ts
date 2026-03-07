import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FreelancerService } from '../../core/services/freelancer.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Freelancer } from '../../core/models';
import { environment } from '../../../environments/environment';

interface PointsPackage {
  id: number;
  name: string;
  totalPoints: number;
  remainingPoints: number;
  purchasedAt: string;
  color: string;
}

interface Transaction {
  action: string;
  type: 'APPLICATION' | 'AI_MATCHING' | 'PURCHASE' | 'BOOST' | 'FEATURED';
  date: string;
  points: number;
}

@Component({
  selector: 'app-freelancer-balance',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './freelancer-balance.component.html',
  styleUrl: './freelancer-balance.component.css',
})
export class FreelancerBalanceComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  loading = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

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

  // Mock packages
  packages = signal<PointsPackage[]>([
    { id: 1, name: 'Starter Pack', totalPoints: 100, remainingPoints: 45, purchasedAt: '2026-02-01', color: '#3793B0' },
    { id: 2, name: 'Boost Pack', totalPoints: 50, remainingPoints: 28, purchasedAt: '2026-02-10', color: '#3b82f6' },
  ]);

  totalPoints = computed(() => this.packages().reduce((sum, p) => sum + p.remainingPoints, 0));

  // Chart period toggle
  chartPeriod = signal<'daily' | 'monthly' | 'yearly'>('monthly');

  // Mock chart data
  dailyData = signal([3, 0, 5, 2, 0, 10, 5, 0, 3, 0, 5, 0, 0, 8]);
  dailyLabels = ['Feb 8', 'Feb 9', 'Feb 10', 'Feb 11', 'Feb 12', 'Feb 13', 'Feb 14', 'Feb 15', 'Feb 16', 'Feb 17', 'Feb 18', 'Feb 19', 'Feb 20', 'Feb 21'];

  monthlyData = signal([20, 35, 15, 45, 30, 27]);
  monthlyLabels = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

  yearlyData = signal([120, 180, 210, 160, 200]);
  yearlyLabels = ['2022', '2023', '2024', '2025', '2026'];

  // Active chart data
  activeData = computed(() => {
    switch (this.chartPeriod()) {
      case 'daily': return this.dailyData();
      case 'monthly': return this.monthlyData();
      case 'yearly': return this.yearlyData();
    }
  });

  activeLabels = computed(() => {
    switch (this.chartPeriod()) {
      case 'daily': return this.dailyLabels;
      case 'monthly': return this.monthlyLabels;
      case 'yearly': return this.yearlyLabels;
    }
  });

  // SVG curve paths
  curvePath = computed(() => this.buildSmoothCurve(this.activeData(), 400, 160));
  areaPath = computed(() => this.buildSmoothArea(this.activeData(), 400, 160));

  curveMaxValue = computed(() => Math.max(...this.activeData(), 1));

  // Mock transactions
  transactions = signal<Transaction[]>([
    { action: 'Applied to mission', type: 'APPLICATION', date: '2026-02-20', points: -5 },
    { action: 'AI Matching', type: 'AI_MATCHING', date: '2026-02-19', points: -10 },
    { action: 'Applied to mission', type: 'APPLICATION', date: '2026-02-18', points: -5 },
    { action: 'Featured Profile', type: 'FEATURED', date: '2026-02-17', points: -15 },
    { action: 'Applied to mission', type: 'APPLICATION', date: '2026-02-15', points: -5 },
    { action: 'Profile Boost', type: 'BOOST', date: '2026-02-12', points: -8 },
    { action: 'Purchased Boost Pack', type: 'PURCHASE', date: '2026-02-10', points: 50 },
    { action: 'Applied to mission', type: 'APPLICATION', date: '2026-02-08', points: -5 },
    { action: 'AI Matching', type: 'AI_MATCHING', date: '2026-02-05', points: -10 },
    { action: 'Purchased Starter Pack', type: 'PURCHASE', date: '2026-02-01', points: 100 },
  ]);

  constructor(
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => {
        this.freelancer.set(profile);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.notificationService.getUnreadCount().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  get profilePicture(): string | undefined {
    return this.freelancer()?.profilePicture;
  }

  setChartPeriod(period: 'daily' | 'monthly' | 'yearly'): void {
    this.chartPeriod.set(period);
  }

  getPackagePercent(pkg: PointsPackage): number {
    return (pkg.remainingPoints / pkg.totalPoints) * 100;
  }

  getStrokeDashoffset(pkg: PointsPackage): number {
    const circumference = 2 * Math.PI * 50; // r=50
    const percent = pkg.remainingPoints / pkg.totalPoints;
    return circumference * (1 - percent);
  }

  getTotalStrokeDashoffset(): number {
    const circumference = 2 * Math.PI * 50;
    const totalRemaining = this.totalPoints();
    const totalMax = this.packages().reduce((sum, p) => sum + p.totalPoints, 0);
    const percent = totalMax > 0 ? totalRemaining / totalMax : 0;
    return circumference * (1 - percent);
  }

  getCircumference(): number {
    return 2 * Math.PI * 50;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
