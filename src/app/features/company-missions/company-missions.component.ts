import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { MissionService } from '../../core/services/mission.service';
import { ApplicationService } from '../../core/services/application.service';
import { NotificationService } from '../../core/services/notification.service';
import { Mission } from '../../core/models/mission.model';
import { Company } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-company-missions',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './company-missions.component.html',
  styleUrl: './company-missions.component.css',
})
export class CompanyMissionsComponent implements OnInit, OnDestroy {
  company = signal<Company | null>(null);
  missions = signal<Mission[]>([]);
  applicationCounts = signal<Record<string, number>>({});
  loading = signal(true);
  sidebarCollapsed = signal(false);
  unreadCount = computed(() => this.notificationService.unreadCount());
  filterStatus = signal<string>('ALL');
  searchQuery = signal<string>('');
  searchFocused = false;
  selectedMission = signal<Mission | null>(null);
  detailLoading = signal(false);
  private langSub?: Subscription;

  // Pagination
  readonly PAGE_SIZE = 7;
  readonly Math = Math;
  missionPage = signal(0);
  totalMissionPages = computed(() => Math.max(1, Math.ceil(this.filteredMissions().length / this.PAGE_SIZE)));
  pagedMissions = computed(() => {
    const start = this.missionPage() * this.PAGE_SIZE;
    return this.filteredMissions().slice(start, start + this.PAGE_SIZE);
  });

  companyName = computed(() => this.company()?.companyName || 'Company');
  managerName = computed(() => this.company()?.managerName || '');
  managerPosition = computed(() => this.company()?.managerPosition || 'Manager');
  managerInitials = computed(() => {
    const name = this.managerName();
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  });
  companyInitials = computed(() => {
    const name = this.companyName();
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  });

  filteredMissions = computed(() => {
    let list = [...this.missions()];

    // Default sort: newest first (by createdAt)
    list.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    // Status filter
    const status = this.filterStatus();
    if (status !== 'ALL') {
      list = list.filter(m => m.status === status);
    }

    // Search filter
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(m => m.jobTitle.toLowerCase().includes(q));
    }

    return list;
  });

  countByStatus = computed(() => {
    const all = this.missions();
    const counts: Record<string, number> = { ALL: all.length };
    for (const m of all) {
      if (m.status) counts[m.status] = (counts[m.status] || 0) + 1;
    }
    return counts;
  });

  constructor(
    private companyService: CompanyService,
    private missionService: MissionService,
    private applicationService: ApplicationService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    public router: Router,
    private location: Location,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.companyService.getMyProfile().subscribe({
      next: (profile) => this.company.set(profile),
    });

    forkJoin({
      missions: this.missionService.getMyMissions(),
      applications: this.applicationService.getCompanyApplications(),
    }).subscribe({
      next: ({ missions, applications }) => {
        this.missions.set(missions);
        const counts: Record<string, number> = {};
        for (const app of applications) {
          counts[app.missionId] = (counts[app.missionId] || 0) + 1;
        }
        this.applicationCounts.set(counts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  getApplicationCount(missionId: string | undefined): number {
    if (!missionId) return 0;
    return this.applicationCounts()[missionId] || 0;
  }

  setFilter(status: string): void {
    this.filterStatus.set(status);
    this.missionPage.set(0);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.missionPage.set(0);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.missionPage.set(0);
  }

  missionPrevPage(): void { this.missionPage.update(p => Math.max(0, p - 1)); }
  missionNextPage(): void { this.missionPage.update(p => Math.min(this.totalMissionPages() - 1, p + 1)); }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  viewMission(id: string | undefined): void {
    if (!id) return;
    this.detailLoading.set(true);
    this.selectedMission.set(null);
    this.missionService.getMissionById(id).subscribe({
      next: (mission) => {
        this.selectedMission.set(mission);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  closeMissionDetail(): void {
    this.selectedMission.set(null);
  }

  getTimeAgo(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return this.translate.instant('company_missions.time_min_ago', { n: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return this.translate.instant('company_missions.time_hour_ago', { n: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return this.translate.instant('company_missions.time_day_ago', { n: diffDays });
    const diffMonths = Math.floor(diffDays / 30);
    return this.translate.instant('company_missions.time_month_ago', { n: diffMonths });
  }

  getSkillsList(skills: string): string[] {
    return skills.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  getTruncatedDescription(text: string | undefined, maxLength = 300): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  viewApplications(event: Event, missionId: string | undefined): void {
    event.stopPropagation();
    if (missionId) this.router.navigate(['/mission-applications', missionId]);
  }

  editMission(event: Event, id: string | undefined): void {
    event.stopPropagation();
    if (id) this.router.navigate(['/edit-mission', id]);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    return environment.apiUrl.replace(/\/api$/, '') + relativePath;
  }

  get companyLogo(): string | undefined {
    return this.company()?.companyLogo;
  }

  getStatusLabel(status: string | undefined): string {
    const keys: Record<string, string> = {
      OPEN: 'company_missions.status_open',
      CLOSED: 'company_missions.status_closed',
      IN_PROGRESS: 'company_missions.status_in_progress',
      COMPLETED: 'company_missions.status_completed',
      CANCELLED: 'company_missions.status_cancelled',
    };
    const key = keys[status || ''];
    return key ? this.translate.instant(key) : (status || '—');
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
