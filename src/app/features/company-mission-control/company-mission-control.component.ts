import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { ActiveMissionService } from '../../core/services/active-mission.service';
import { ThemeService } from '../../core/services/theme.service';
import { Company } from '../../core/models/user.model';
import { ActiveMission } from '../../core/models/active-mission.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-company-mission-control',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './company-mission-control.component.html',
  styleUrl: './company-mission-control.component.css',
})
export class CompanyMissionControlComponent implements OnInit, OnDestroy {
  company  = signal<Company | null>(null);
  private langSub?: Subscription;
  missions = signal<ActiveMission[]>([]);
  loading  = signal(true);
  sidebarCollapsed = signal(false);
  unreadCount = computed(() => this.notificationService.unreadCount());

  activeMissionsCount = computed(() => this.missions().filter(m => m.status === 'ACTIVE').length);

  deletingId  = signal<string | null>(null);
  confirmDeleteId = signal<string | null>(null);

  companyName = computed(() => this.company()?.companyName || 'Company');
  companyLogo = computed(() => this.company()?.companyLogo);
  companyInitials = computed(() => {
    const n = this.companyName();
    return n.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  });

  constructor(
    private companyService: CompanyService,
    private notificationService: NotificationService,
    private activeMissionService: ActiveMissionService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.companyService.getMyProfile().subscribe({
      next: (profile) => this.company.set(profile),
    });

    this.activeMissionService.getCompanyMissions().subscribe({
      next: (missions) => {
        this.missions.set(missions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.notificationService.getUnreadCount().subscribe();

    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goToMission(id: string): void {
    this.router.navigate(['/company-mission-view', id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':   return 'status-pending';
      case 'ACTIVE':    return 'status-active';
      case 'SUBMITTED': return 'status-submitted';
      case 'COMPLETED': return 'status-completed';
      case 'PAUSED':    return 'status-paused';
      case 'DISPUTE':   return 'status-dispute';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  }

  isOverdue(m: ActiveMission): boolean {
    if (m.status !== 'ACTIVE') return false;
    const end = m.endDate;
    if (!end) return false;
    return new Date(end) <= new Date();
  }

  requestDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId.set(id);
  }

  cancelDelete(event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId.set(null);
  }

  confirmDelete(id: string, event: Event): void {
    event.stopPropagation();
    this.deletingId.set(id);
    this.activeMissionService.deleteFromHistoryByCompany(id).subscribe({
      next: () => {
        this.missions.update(list => list.filter(m => m.id !== id));
        this.deletingId.set(null);
        this.confirmDeleteId.set(null);
      },
      error: () => {
        this.deletingId.set(null);
        this.confirmDeleteId.set(null);
      },
    });
  }
}
