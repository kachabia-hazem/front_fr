import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ApplicationService } from '../../core/services/application.service';
import { NotificationService } from '../../core/services/notification.service';
import { Application } from '../../core/models/application.model';
import { Company } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-company-applications',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './company-applications.component.html',
  styleUrl: './company-applications.component.css',
})
export class CompanyApplicationsComponent implements OnInit {
  company = signal<Company | null>(null);
  allApplications = signal<Application[]>([]);
  loading = signal(true);
  sidebarCollapsed = signal(false);
  unreadCount = computed(() => this.notificationService.unreadCount());
  updatingId = signal<string | null>(null);

  // Filters
  searchQuery   = signal('');
  missionFilter = signal('ALL');
  statusFilter  = signal('ALL');
  sortDirection = signal<'desc' | 'asc'>('desc');

  // Pagination
  currentPage = signal(1);
  readonly pageSize = 5;
  Math = Math;

  // Computed sidebar info
  companyName = computed(() => this.company()?.companyName || 'Company');
  managerName = computed(() => this.company()?.managerName || '');
  managerPosition = computed(() => this.company()?.managerPosition || 'Manager');
  managerInitials = computed(() => {
    const n = this.managerName();
    return n ? n.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?';
  });
  companyInitials = computed(() => {
    const n = this.companyName();
    return n ? n.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?';
  });
  get companyLogo(): string | undefined { return this.company()?.companyLogo; }

  // Unique missions for filter dropdown
  uniqueMissions = computed(() => {
    const seen = new Map<string, string>();
    for (const app of this.allApplications()) {
      if (app.missionId && app.missionTitle && !seen.has(app.missionId)) {
        seen.set(app.missionId, app.missionTitle);
      }
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  });

  // Filtered + sorted list
  filteredApplications = computed(() => {
    let apps = this.allApplications();
    const q       = this.searchQuery().toLowerCase().trim();
    const mission = this.missionFilter();
    const status  = this.statusFilter();
    const dir     = this.sortDirection();

    if (q) {
      apps = apps.filter(a =>
        (`${a.firstName} ${a.lastName}`).toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.missionTitle || '').toLowerCase().includes(q)
      );
    }
    if (mission !== 'ALL') apps = apps.filter(a => a.missionId === mission);
    if (status  !== 'ALL') apps = apps.filter(a => a.status    === status);

    return [...apps].sort((a, b) => {
      const da = new Date(a.submittedAt).getTime();
      const db = new Date(b.submittedAt).getTime();
      return dir === 'desc' ? db - da : da - db;
    });
  });

  // Stats
  totalCount    = computed(() => this.allApplications().length);
  pendingCount  = computed(() => this.allApplications().filter(a => a.status === 'PENDING').length);
  acceptedCount = computed(() => this.allApplications().filter(a => a.status === 'ACCEPTED').length);
  rejectedCount = computed(() => this.allApplications().filter(a => a.status === 'REJECTED').length);

  // Pagination
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredApplications().length / this.pageSize)));
  paginatedApplications = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredApplications().slice(start, start + this.pageSize);
  });

  hasActiveFilters = computed(() =>
    this.searchQuery() !== '' || this.missionFilter() !== 'ALL' || this.statusFilter() !== 'ALL'
  );

  constructor(
    private companyService: CompanyService,
    private applicationService: ApplicationService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.companyService.getMyProfile().subscribe({ next: p => this.company.set(p) });

    this.applicationService.getCompanyApplications().subscribe({
      next: apps => { this.allApplications.set(apps); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  // ── Actions ──────────────────────────────────────────
  accept(event: Event, app: Application): void {
    event.stopPropagation();
    if (this.updatingId()) return;
    this.updatingId.set(app.id);
    this.applicationService.updateApplicationStatus(app.id, 'ACCEPTED').subscribe({
      next: updated => { this.updateStatus(updated); this.updatingId.set(null); },
      error: ()      => this.updatingId.set(null),
    });
  }

  reject(event: Event, app: Application): void {
    event.stopPropagation();
    if (this.updatingId()) return;
    this.updatingId.set(app.id);
    this.applicationService.updateApplicationStatus(app.id, 'REJECTED').subscribe({
      next: updated => { this.updateStatus(updated); this.updatingId.set(null); },
      error: ()      => this.updatingId.set(null),
    });
  }

  private updateStatus(updated: Application): void {
    this.allApplications.update(list =>
      list.map(a => a.id === updated.id ? { ...a, status: updated.status } : a)
    );
  }

  viewProfile(event: Event, freelancerId: string): void {
    event.stopPropagation();
    this.router.navigate(['/profile', freelancerId]);
  }

  viewMissionApplications(event: Event, missionId: string): void {
    event.stopPropagation();
    this.router.navigate(['/mission-applications', missionId]);
  }

  // ── Filters ──────────────────────────────────────────
  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  onMissionChange(event: Event): void {
    this.missionFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  onStatusSelectChange(event: Event): void {
    this.onStatusChange((event.target as HTMLSelectElement).value);
  }

  toggleSort(): void {
    this.sortDirection.update(d => d === 'desc' ? 'asc' : 'desc');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.missionFilter.set('ALL');
    this.statusFilter.set('ALL');
    this.sortDirection.set('desc');
    this.currentPage.set(1);
  }

  // ── Navigation ───────────────────────────────────────
  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }
  goBack(): void        { this.router.navigate(['/']); }

  // ── Helpers ──────────────────────────────────────────
  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  getInitials(first: string, last: string): string {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  visibleSkills(skills: string[] | undefined): string[] { return (skills || []).slice(0, 3); }
  extraCount(skills: string[] | undefined): number {
    const n = (skills || []).length; return n > 3 ? n - 3 : 0;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p);
  }
}
