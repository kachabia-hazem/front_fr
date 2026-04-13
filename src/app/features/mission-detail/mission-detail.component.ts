import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MissionService, MatchMissionResult } from '../../core/services/mission.service';
import { ApplicationService } from '../../core/services/application.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { Mission } from '../../core/models/mission.model';
import { environment } from '../../../environments/environment';
import { getProfileCompletion } from '../../core/utils/profile-completion';

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, UpperCasePipe],
  templateUrl: './mission-detail.component.html',
  styleUrl: './mission-detail.component.css',
})
export class MissionDetailComponent implements OnInit {
  mission = signal<Mission | null>(null);
  loading = signal(true);
  error = signal('');
  fromFavorites = false;
  hasApplied = signal(false);
  applicationStatus = signal<'PENDING' | 'ACCEPTED' | 'REJECTED' | null>(null);
  withdrawing = signal(false);
  matchingLoading = signal(false);
  matchingResult = signal<MatchMissionResult | null>(null);
  showMatchingModal = signal(false);
  matchingError = signal('');
  explanationLoading = signal(false);
  private profileCompletion: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private missionService: MissionService,
    private applicationService: ApplicationService,
    private freelancerService: FreelancerService,
    private toastService: ToastService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isFreelancer(): boolean {
    return this.authService.currentUser()?.role === 'FREELANCER';
  }

  ngOnInit(): void {
    this.fromFavorites = this.route.snapshot.queryParamMap.get('from') === 'favorites';
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadMission(id);
    } else {
      this.error.set('Mission not found');
      this.loading.set(false);
    }
    if (this.isFreelancer) {
      this.freelancerService.getMyProfile().subscribe({
        next: (f) => this.profileCompletion = getProfileCompletion(f),
      });
    }
  }

  private loadMission(id: string): void {
    this.missionService.getMissionById(id).subscribe({
      next: (mission) => {
        this.mission.set(mission);
        this.loading.set(false);
        if (this.isFreelancer) {
          this.checkApplicationStatus(id);
        }
      },
      error: () => {
        this.error.set('Mission not found');
        this.loading.set(false);
      },
    });
  }

  private readonly APP_STATUS_CACHE_KEY = 'wl_app_status_cache';

  private checkApplicationStatus(missionId: string): void {
    // Restore from cache immediately (no network lag)
    try {
      const raw = localStorage.getItem(this.APP_STATUS_CACHE_KEY);
      if (raw) {
        const entries: [string, 'PENDING' | 'ACCEPTED' | 'REJECTED'][] = JSON.parse(raw);
        const cached = new Map(entries).get(missionId) ?? null;
        if (cached) {
          this.hasApplied.set(true);
          this.applicationStatus.set(cached);
        }
      }
    } catch { /* ignore */ }

    // Refresh from API to ensure accuracy
    this.applicationService.getMyApplications().subscribe({
      next: (applications) => {
        const app = applications.find(a => a.missionId === missionId && a.status !== 'WITHDRAWN');
        if (app) {
          this.hasApplied.set(true);
          this.applicationStatus.set(app.status as 'PENDING' | 'ACCEPTED' | 'REJECTED');
        } else {
          this.hasApplied.set(false);
          this.applicationStatus.set(null);
        }
      },
    });
  }

  goBack(): void {
    this.router.navigate([this.fromFavorites ? '/saved-missions' : '/missions']);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  formatDate(date: string | any): string {
    try {
      if (!date) return '';
      if (Array.isArray(date)) {
        const [y, m, d] = date;
        return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      }
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(date);
    }
  }

  getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }

  getSkillsList(skills: string): string[] {
    return skills.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  getTruncatedDescription(text: string | undefined, maxLength = 200): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  applyToMission(): void {
    if (this.profileCompletion !== null && this.profileCompletion < 80) {
      this.toastService.show(
        `Your profile is ${this.profileCompletion}% complete. Please complete at least 80% of your profile before applying.`,
        'warning'
      );
      return;
    }
    const id = this.mission()?.id;
    if (id) {
      this.router.navigate(['/apply', id]);
    }
  }

  withdrawApplication(): void {
    const id = this.mission()?.id;
    if (!id) return;
    this.withdrawing.set(true);
    this.applicationService.withdrawApplication(id).subscribe({
      next: () => {
        this.hasApplied.set(false);
        this.applicationStatus.set(null);
        this.withdrawing.set(false);
        this.toastService.show('Your application has been withdrawn successfully.', 'success');
      },
      error: () => {
        this.withdrawing.set(false);
        this.toastService.show('Failed to withdraw application.', 'error');
      },
    });
  }

  checkMatching(): void {
    const id = this.mission()?.id ?? this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastService.show('Mission ID not found.', 'error');
      return;
    }
    this.matchingLoading.set(true);
    this.showMatchingModal.set(true);
    this.matchingResult.set(null);
    this.matchingError.set('');
    this.explanationLoading.set(false);

    // Phase 1: résultats rapides (~2s, sans LLM)
    this.missionService.matchMission(id).subscribe({
      next: (result) => {
        this.matchingResult.set(result);
        this.matchingLoading.set(false);
        this.cdr.detectChanges();

        // Phase 2: explication IA en arrière-plan (~30s, avec LLM)
        this.explanationLoading.set(true);
        this.cdr.detectChanges();
        this.missionService.matchMissionExplain(id).subscribe({
          next: (fullResult) => {
            this.matchingResult.set(fullResult);
            this.explanationLoading.set(false);
            this.cdr.detectChanges();
          },
          error: () => {
            this.explanationLoading.set(false);
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        this.matchingLoading.set(false);
        const status = err?.status;
        if (status === 403) {
          this.matchingError.set('Access denied (403). Make sure you are logged in as a freelancer and the backend has been restarted.');
        } else if (status === 500) {
          this.matchingError.set('Server error (500). The AI service may still be starting up, please try again.');
        } else {
          this.matchingError.set(`Connection error (${status || 'network'}). Please make sure the backend is running.`);
        }
        this.cdr.detectChanges();
      },
    });
  }

  closeMatchingModal(): void {
    this.showMatchingModal.set(false);
    this.matchingResult.set(null);
    this.matchingError.set('');
    this.explanationLoading.set(false);
  }

  getRecommendationClass(recommendation: string): string {
    if (recommendation === 'APPLY') return 'rec-positive';
    if (recommendation === 'APPLY WITH RESERVATIONS') return 'rec-neutral';
    return 'rec-negative';
  }

  getScoreColor(score: number): string {
    if (score >= 65) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }
}
