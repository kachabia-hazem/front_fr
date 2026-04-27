import { TranslateModule } from '@ngx-translate/core';
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { MissionService } from '../../core/services/mission.service';
import { ApplicationService } from '../../core/services/application.service';
import { Application, RankedApplication } from '../../core/models/application.model';
import { Mission } from '../../core/models/mission.model';
import { Company } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mission-applications',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './mission-applications.component.html',
  styleUrl: './mission-applications.component.css',
})
export class MissionApplicationsComponent implements OnInit {
  company = signal<Company | null>(null);
  mission = signal<Mission | null>(null);
  applications = signal<Application[]>([]);
  loading = signal(true);
  sidebarCollapsed = signal(false);
  updatingId = signal<string | null>(null);
  isRanking = signal(false);
  rankingError = signal('');
  showRankConfirm = signal(false);
  rankedApplications = signal<RankedApplication[]>([]);
  rankedView = signal(false);

  missionId = '';

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

  // Sorted by submittedAt descending (most recent first) by default
  sortedApplications = computed(() => {
    return [...this.applications()].sort((a, b) => {
      const da = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const db = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return db - da;
    });
  });

  pendingCount = computed(() => this.applications().filter(a => a.status === 'PENDING').length);
  acceptedCount = computed(() => this.applications().filter(a => a.status === 'ACCEPTED').length);
  rejectedCount = computed(() => this.applications().filter(a => a.status === 'REJECTED').length);

  constructor(
    private companyService: CompanyService,
    private missionService: MissionService,
    private applicationService: ApplicationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';

    this.companyService.getMyProfile().subscribe({
      next: (profile) => this.company.set(profile),
    });

    this.missionService.getMissionById(this.missionId).subscribe({
      next: (m) => this.mission.set(m),
    });

    this.applicationService.getMissionApplications(this.missionId).subscribe({
      next: (apps) => {
        this.applications.set(apps);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/company-missions']);
  }

  accept(event: Event, app: Application): void {
    event.stopPropagation();
    if (this.updatingId()) return;
    this.updatingId.set(app.id);
    this.applicationService.updateApplicationStatus(app.id, 'ACCEPTED').subscribe({
      next: (updated) => {
        this.applications.update(list =>
          list.map(a => a.id === updated.id ? { ...a, status: updated.status } : a)
        );
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null),
    });
  }

  reject(event: Event, app: Application): void {
    event.stopPropagation();
    if (this.updatingId()) return;
    this.updatingId.set(app.id);
    this.applicationService.updateApplicationStatus(app.id, 'REJECTED').subscribe({
      next: (updated) => {
        this.applications.update(list =>
          list.map(a => a.id === updated.id ? { ...a, status: updated.status } : a)
        );
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null),
    });
  }

  goToProfile(event: Event, freelancerId: string): void {
    event.stopPropagation();
    this.router.navigate(['/profile', freelancerId]);
  }

  openRankConfirm(): void { this.showRankConfirm.set(true); }
  cancelRankConfirm(): void { this.showRankConfirm.set(false); }

  onAiSort(): void {
    this.showRankConfirm.set(false);
    if (this.isRanking()) return;
    this.isRanking.set(true);
    this.rankingError.set('');
    this.applicationService.getRankedApplications(this.missionId).subscribe({
      next: (results) => {
        this.rankedApplications.set(results);
        this.rankedView.set(true);
        this.isRanking.set(false);
      },
      error: (err) => {
        this.isRanking.set(false);
        if (err.status === 402) {
          this.rankingError.set(
            (err.error?.message ?? 'Solde insuffisant.') +
            ' Rechargez vos points sur la page Offres.'
          );
        } else {
          this.rankingError.set('Erreur lors du classement IA. Veuillez réessayer.');
        }
      },
    });
  }

  exitRankedView(): void {
    this.rankedView.set(false);
    this.rankedApplications.set([]);
  }

  acceptRanked(event: Event, applicationId: string): void {
    event.stopPropagation();
    if (this.updatingId()) return;
    this.updatingId.set(applicationId);
    this.applicationService.updateApplicationStatus(applicationId, 'ACCEPTED').subscribe({
      next: (updated) => {
        this.rankedApplications.update(list =>
          list.map(r => r.applicationId === applicationId ? { ...r, status: updated.status } : r)
        );
        this.applications.update(list =>
          list.map(a => a.id === applicationId ? { ...a, status: updated.status } : a)
        );
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null),
    });
  }

  rejectRanked(event: Event, applicationId: string): void {
    event.stopPropagation();
    if (this.updatingId()) return;
    this.updatingId.set(applicationId);
    this.applicationService.updateApplicationStatus(applicationId, 'REJECTED').subscribe({
      next: (updated) => {
        this.rankedApplications.update(list =>
          list.map(r => r.applicationId === applicationId ? { ...r, status: updated.status } : r)
        );
        this.applications.update(list =>
          list.map(a => a.id === applicationId ? { ...a, status: updated.status } : a)
        );
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null),
    });
  }

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-mid';
    return 'score-low';
  }

  getRankMedal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '#' + rank;
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    return environment.apiUrl.replace(/\/api$/, '') + relativePath;
  }

  get companyLogo(): string | undefined {
    return this.company()?.companyLogo;
  }

  getInitials(firstName: string, lastName: string): string {
    return ((firstName?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase();
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getStatusClass(status: string): string {
    return 'status-' + status.toLowerCase();
  }

  visibleSkills(skills: string[] | undefined): string[] {
    return (skills || []).slice(0, 3);
  }

  extraSkillsCount(skills: string[] | undefined): number {
    const len = (skills || []).length;
    return len > 3 ? len - 3 : 0;
  }
}
