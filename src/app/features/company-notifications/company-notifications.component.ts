import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Notification, NotificationType } from '../../core/models/notification.model';
import { Company } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';
import { HighlightPipe } from '../../shared/pipes/highlight.pipe';

type FilterType = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-company-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, HighlightPipe, TranslateModule],
  templateUrl: './company-notifications.component.html',
  styleUrl: './company-notifications.component.css',
})
export class CompanyNotificationsComponent implements OnInit, OnDestroy {
  company = signal<Company | null>(null);
  get notifications() { return this.notificationService.notifications; }
  loading = signal(true);
  sidebarCollapsed = signal(false);

  searchQuery = signal('');
  filterType = signal<FilterType>('all');
  selectedSender = signal('');
  selectedDate = signal('');

  companyName = computed(() => this.company()?.companyName || 'Company');
  managerName = computed(() => this.company()?.managerName || '');
  managerPosition = computed(() => this.company()?.managerPosition || 'Manager');
  companyInitials = computed(() => {
    const name = this.companyName();
    const parts = name.split(' ').filter(Boolean);
    return parts.map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  });
  managerInitials = computed(() => {
    const name = this.managerName();
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    return parts.map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2);
  });

  get companyLogo(): string | undefined {
    return this.company()?.companyLogo;
  }

  senders = computed(() => {
    const all = this.notifications();
    const names = [...new Set(all.map(n => n.senderName).filter(Boolean))];
    return names.sort();
  });

  filtered = computed(() => {
    let list = this.notifications();
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.filterType();
    const sender = this.selectedSender();
    const date = this.selectedDate();

    if (type === 'unread') list = list.filter(n => !n.isRead);
    if (type === 'read')   list = list.filter(n => n.isRead);
    if (sender) list = list.filter(n => n.senderName === sender);
    if (date) {
      list = list.filter(n => {
        const d = new Date(n.createdAt);
        return d.toLocaleDateString('en-CA') === date;
      });
    }
    if (q) {
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.senderName.toLowerCase().includes(q),
      );
    }
    return list;
  });

  unreadCount = computed(() => this.notificationService.unreadCount());
  expandedIds = signal<Set<string>>(new Set());
  private langSub?: Subscription;

  // Pagination
  readonly PAGE_SIZE = 5;
  currentPage = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.PAGE_SIZE)));
  paginatedNotifications = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.PAGE_SIZE;
    return this.filtered().slice(start, start + this.PAGE_SIZE);
  });
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  constructor(
    private notificationService: NotificationService,
    private companyService: CompanyService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.companyService.getMyProfile().subscribe({
      next: (profile) => this.company.set(profile),
    });
    this.loadNotifications();
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationService.getMyNotifications().subscribe({
      next: () => {
        this.loading.set(false);
        const targetId = this.route.snapshot.queryParamMap.get('id');
        if (targetId) this.scrollToNotification(targetId);
      },
      error: () => this.loading.set(false),
    });
  }

  private scrollToNotification(id: string): void {
    this.expandedIds.update(set => { const next = new Set(set); next.add(id); return next; });
    const index = this.filtered().findIndex(n => n.id === id);
    if (index !== -1) {
      this.currentPage.set(Math.floor(index / this.PAGE_SIZE) + 1);
    }
    setTimeout(() => {
      const el = document.getElementById('notif-' + id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('notif-highlight');
        setTimeout(() => el.classList.remove('notif-highlight'), 2000);
      }
    }, 100);
  }

  markAsRead(notification: Notification): void {
    if (notification.isRead) return;
    this.notificationService.markAsRead(notification.id).subscribe();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  handleNotificationClick(notification: Notification): void {
    this.markAsRead(notification);
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(notification.id)) { next.delete(notification.id); }
      else { next.add(notification.id); }
      return next;
    });
  }

  isExpanded(notificationId: string): boolean {
    return this.expandedIds().has(notificationId);
  }

  setFilterType(type: FilterType): void {
    this.filterType.set(type);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterType.set('all');
    this.selectedSender.set('');
    this.selectedDate.set('');
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  goBack(): void { this.router.navigate(['/']); }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMin < 1)  return this.translate.instant('notifications_page.time_just_now');
    if (diffMin < 60) return this.translate.instant('notifications_page.time_min_ago', { n: diffMin });
    if (diffHours < 24) return this.translate.instant('notifications_page.time_hour_ago', { n: diffHours });
    if (diffDays < 7)   return this.translate.instant('notifications_page.time_day_ago', { n: diffDays });
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getTypeIcon(type: NotificationType | string): string {
    const icons: Record<string, string> = {
      COMPANY_WELCOME: '🏢',
      MISSION_PUBLISHED: '📋',
      APPLICATION_RECEIVED: '📥',
      PENDING_APPLICATIONS_REMINDER: '⏰',
      MISSION_CLOSED: '🔒',
      WELCOME: '👋',
      APPLICATION_SUBMITTED: '📤',
      APPLICATION_ACCEPTED: '✅',
      APPLICATION_REJECTED: '❌',
      APPLICATION_WITHDRAWN: '↩️',
      NEW_MISSION_MATCH: '🎯',
      MISSION_DEADLINE_SOON: '⚠️',
      PROFILE_INCOMPLETE: '⚠️',
    };
    return icons[type] || '🔔';
  }

  getTypeClass(type: NotificationType | string): string {
    const classes: Record<string, string> = {
      COMPANY_WELCOME: 'type-welcome',
      MISSION_PUBLISHED: 'type-mission',
      APPLICATION_RECEIVED: 'type-submitted',
      PENDING_APPLICATIONS_REMINDER: 'type-deadline',
      MISSION_CLOSED: 'type-withdrawn',
      WELCOME: 'type-welcome',
      APPLICATION_SUBMITTED: 'type-submitted',
      APPLICATION_ACCEPTED: 'type-accepted',
      APPLICATION_REJECTED: 'type-rejected',
      APPLICATION_WITHDRAWN: 'type-withdrawn',
      NEW_MISSION_MATCH: 'type-mission',
      MISSION_DEADLINE_SOON: 'type-deadline',
      PROFILE_INCOMPLETE: 'type-warning',
    };
    return classes[type] || 'type-default';
  }

  onSearchChange(value: string): void { this.searchQuery.set(value); this.currentPage.set(1); }
  onSenderChange(value: string): void { this.selectedSender.set(value); this.currentPage.set(1); }
  onDateChange(value: string): void { this.selectedDate.set(value); this.currentPage.set(1); }
}
