import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { CompanyDashboardService, CompanyDashboardStats } from '../../core/services/company-dashboard.service';
import { Company } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './company-dashboard.component.html',
  styleUrl: './company-dashboard.component.css',
})
export class CompanyDashboardComponent implements OnInit {
  company = signal<Company | null>(null);
  stats = signal<CompanyDashboardStats | null>(null);
  loading = signal(true);
  sidebarCollapsed = signal(false);

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
      OPEN: '#5aaa9e',
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
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
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
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
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
