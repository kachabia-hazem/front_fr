import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FreelancerService } from '../../core/services/freelancer.service';
import { NotificationService } from '../../core/services/notification.service';
import { ActiveMissionService } from '../../core/services/active-mission.service';
import { ThemeService } from '../../core/services/theme.service';
import { Freelancer } from '../../core/models';
import { ActiveMission } from '../../core/models/active-mission.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-freelancer-missions',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './freelancer-missions.component.html',
  styleUrl: './freelancer-missions.component.css',
})
export class FreelancerMissionsComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  missions = signal<ActiveMission[]>([]);
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

  activeMissionsCount = computed(() => this.missions().filter(m => m.status === 'ACTIVE').length);

  constructor(
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    private activeMissionService: ActiveMissionService,
    public themeService: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => this.freelancer.set(profile),
    });

    this.activeMissionService.getFreelancerMissions().subscribe({
      next: (missions) => {
        this.missions.set(missions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.notificationService.getUnreadCount().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goToMission(id: string): void {
    this.router.navigate(['/active-mission', id]);
  }

  goBack(): void {
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'COMPLETED': return 'status-completed';
      case 'PAUSED': return 'status-paused';
      case 'DISPUTE': return 'status-dispute';
      default: return '';
    }
  }
}
