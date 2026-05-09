import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../core/services/application.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Freelancer } from '../../core/models';
import { Application } from '../../core/models/application.model';
import { environment } from '../../../environments/environment';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-freelancer-applications',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, TranslateModule],
  templateUrl: './freelancer-applications.component.html',
  styleUrl: './freelancer-applications.component.css',
})
export class FreelancerApplicationsComponent implements OnInit, OnDestroy{
  freelancer = signal<Freelancer | null>(null);
  allApplications = signal<Application[]>([]);
  loading = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  searchQuery = signal('');
  statusFilter = signal<string>('ALL');
  missionFilter = signal<string>('ALL');
  sortDirection = signal<'desc' | 'asc'>('desc');
  currentPage = signal(1);
  pageSize = 8;

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

  uniqueMissions = computed(() => {
    const seen = new Map<string, string>();
    for (const app of this.allApplications()) {
      if (app.missionId && app.missionTitle && !seen.has(app.missionId)) {
        seen.set(app.missionId, app.missionTitle);
      }
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  });

  filteredApplications = computed(() => {
    let apps = this.allApplications();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const mission = this.missionFilter();
    const dir = this.sortDirection();

    if (query) {
      apps = apps.filter(a =>
        (a.missionTitle || '').toLowerCase().includes(query) ||
        (a.companyName || '').toLowerCase().includes(query) ||
        (a.firstName || '').toLowerCase().includes(query) ||
        (a.lastName || '').toLowerCase().includes(query)
      );
    }

    if (status !== 'ALL') {
      apps = apps.filter(a => a.status === status);
    }

    if (mission !== 'ALL') {
      apps = apps.filter(a => a.missionId === mission);
    }

    return apps.sort((a, b) => {
      const da = new Date(a.submittedAt).getTime();
      const db = new Date(b.submittedAt).getTime();
      return dir === 'desc' ? db - da : da - db;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredApplications().length / this.pageSize)));

  paginatedApplications = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredApplications().slice(start, start + this.pageSize);
  });

  Math = Math;

  totalCount = computed(() => this.allApplications().length);
  acceptedCount = computed(() => this.allApplications().filter(a => a.status === 'ACCEPTED').length);
  pendingCount = computed(() => this.allApplications().filter(a => a.status === 'PENDING').length);
  rejectedCount = computed(() => this.allApplications().filter(a => a.status === 'REJECTED').length);

  private langSub?: Subscription;

    constructor(
  private applicationService: ApplicationService,
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => this.freelancer.set(profile),
    });

    this.applicationService.getMyApplications().subscribe({
      next: (apps) => {
        this.allApplications.set(apps);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.notificationService.getUnreadCount().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  filterByStatus(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  filterByMission(event: Event): void {
    this.missionFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  toggleSortDirection(): void {
    this.sortDirection.update(d => d === 'desc' ? 'asc' : 'desc');
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
    this.missionFilter.set('ALL');
    this.sortDirection.set('desc');
    this.currentPage.set(1);
  }

  hasActiveFilters = computed(() =>
    this.searchQuery() !== '' ||
    this.statusFilter() !== 'ALL' ||
    this.missionFilter() !== 'ALL'
  );

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  goToDashboard(): void {
    this.router.navigate(['/freelancer-dashboard']);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  get profilePicture(): string | undefined {
    return this.freelancer()?.profilePicture;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getCompanyInitials(companyName: string | undefined): string {
    if (!companyName) return '?';
    return companyName.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  dismissingId = signal<string | null>(null);

  withdrawApp(app: Application): void {
    if (confirm(this.translate.instant('freelancer_apps.withdraw_confirm', { title: app.missionTitle }))) {
      this.applicationService.withdrawApplication(app.missionId).subscribe({
        next: () => {
          this.allApplications.update(apps =>
            apps.map(a => a.id === app.id ? { ...a, status: 'WITHDRAWN' as const } : a)
          );
        },
      });
    }
  }

  dismissApp(app: Application): void {
    if (this.dismissingId()) return;
    this.dismissingId.set(app.id);
    this.applicationService.dismissApplication(app.id).subscribe({
      next: () => {
        this.allApplications.update(list => list.filter(a => a.id !== app.id));
        this.dismissingId.set(null);
      },
      error: () => this.dismissingId.set(null),
    });
  }

  viewMission(app: Application): void {
    this.router.navigate(['/missions', app.missionId]);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
