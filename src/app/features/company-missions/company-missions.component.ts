import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
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
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './company-missions.component.html',
  styleUrl: './company-missions.component.css',
})
export class CompanyMissionsComponent implements OnInit {
  company = signal<Company | null>(null);
  missions = signal<Mission[]>([]);
  applicationCounts = signal<Record<string, number>>({});
  loading = signal(true);
  sidebarCollapsed = signal(false);
  unreadCount = computed(() => this.notificationService.unreadCount());
  filterStatus = signal<string>('ALL');
  searchQuery = signal<string>('');
  searchFocused = false;

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
    private router: Router,
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
  }

  getApplicationCount(missionId: string | undefined): number {
    if (!missionId) return 0;
    return this.applicationCounts()[missionId] || 0;
  }

  setFilter(status: string): void {
    this.filterStatus.set(status);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/company-dashboard']);
  }

  viewMission(id: string | undefined): void {
    if (id) this.router.navigate(['/missions', id]);
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
    const labels: Record<string, string> = {
      OPEN: 'Open',
      CLOSED: 'Closed',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };
    return labels[status || ''] || status || '—';
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
