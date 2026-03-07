import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { ActiveMissionService } from '../../core/services/active-mission.service';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { Company } from '../../core/models/user.model';
import { ActiveMission, Task, Deliverable } from '../../core/models/active-mission.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-company-mission-view',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './company-mission-view.component.html',
  styleUrl: './company-mission-view.component.css',
})
export class CompanyMissionViewComponent implements OnInit {
  company     = signal<Company | null>(null);
  mission     = signal<ActiveMission | null>(null);
  tasks       = signal<Task[]>([]);
  deliverables = signal<Deliverable[]>([]);
  loading     = signal(true);
  sidebarCollapsed = signal(false);
  unreadCount = computed(() => this.notificationService.unreadCount());

  // Kanban columns (read-only)
  todoTasks       = computed(() => this.tasks().filter(t => t.status === 'TODO'));
  inProgressTasks = computed(() => this.tasks().filter(t => t.status === 'IN_PROGRESS'));
  doneTasks       = computed(() => this.tasks().filter(t => t.status === 'DONE'));

  companyName = computed(() => this.company()?.companyName || 'Company');
  companyLogo = computed(() => this.company()?.companyLogo);
  companyInitials = computed(() => {
    const n = this.companyName();
    return n.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  });

  private missionId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private activeMissionService: ActiveMissionService,
    private companyService: CompanyService,
    private notificationService: NotificationService,
    public themeService: ThemeService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('id') || '';

    this.companyService.getMyProfile().subscribe({
      next: (profile) => this.company.set(profile),
    });

    this.activeMissionService.getMission(this.missionId).subscribe({
      next: (m) => {
        this.mission.set(m);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.activeMissionService.getTasks(this.missionId).subscribe({
      next: (tasks) => this.tasks.set(tasks),
    });

    this.activeMissionService.getDeliverables(this.missionId).subscribe({
      next: (deliverables) => this.deliverables.set(deliverables),
    });

    this.notificationService.getUnreadCount().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getFileUrl(relativePath: string | null | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
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
