import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Notification, NotificationType } from '../../core/models/notification.model';
import { Freelancer } from '../../core/models';
import { environment } from '../../../environments/environment';
import { HighlightPipe } from '../../shared/pipes/highlight.pipe';

type FilterType = 'all' | 'unread' | 'read';

@Component({
  selector: 'app-freelancer-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, HighlightPipe],
  templateUrl: './freelancer-notifications.component.html',
  styleUrl: './freelancer-notifications.component.css',
})
export class FreelancerNotificationsComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  /** Pointe vers le signal partagé du service — persiste entre les navigations */
  get notifications() { return this.notificationService.notifications; }
  loading = signal(true);
  sidebarCollapsed = signal(false);

  // Filters
  searchQuery = signal('');
  filterType = signal<FilterType>('all');
  selectedSender = signal('');
  selectedDate = signal('');

  // Computed values
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

  get profilePicture(): string | undefined {
    return this.freelancer()?.profilePicture;
  }

  // All unique senders from notifications
  senders = computed(() => {
    const all = this.notifications();
    const names = [...new Set(all.map(n => n.senderName).filter(Boolean))];
    return names.sort();
  });

  // Filtered notifications
  filtered = computed(() => {
    let list = this.notifications();
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.filterType();
    const sender = this.selectedSender();
    const date = this.selectedDate();

    if (type === 'unread') list = list.filter(n => !n.isRead);
    if (type === 'read') list = list.filter(n => n.isRead);

    if (sender) list = list.filter(n => n.senderName === sender);

    if (date) {
      list = list.filter(n => {
        const d = new Date(n.createdAt);
        const local = d.toLocaleDateString('en-CA'); // yyyy-MM-dd
        return local === date;
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
    private freelancerService: FreelancerService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => this.freelancer.set(profile),
    });

    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationService.getMyNotifications().subscribe({
      next: () => {
        // Service tap already updated this.notifications via the shared signal
        this.loading.set(false);
        const targetId = this.route.snapshot.queryParamMap.get('id');
        if (targetId) {
          this.scrollToNotification(targetId);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private scrollToNotification(id: string): void {
    this.expandedIds.update(set => { const next = new Set(set); next.add(id); return next; });
    // Jump to the correct page first
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
    // Service tap handles: _localReadIds tracking + notifications signal update + unreadCount decrement
    this.notificationService.markAsRead(notification.id).subscribe();
  }

  markAllAsRead(): void {
    // Service tap handles: notifications signal update + unreadCount reset
    this.notificationService.markAllAsRead().subscribe();
  }

  handleNotificationClick(notification: Notification): void {
    this.markAsRead(notification);
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(notification.id)) {
        next.delete(notification.id);
      } else {
        next.add(notification.id);
      }
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

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getTypeIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      WELCOME: '👋',
      APPLICATION_SUBMITTED: '📤',
      APPLICATION_ACCEPTED: '✅',
      APPLICATION_REJECTED: '❌',
      APPLICATION_WITHDRAWN: '↩️',
      NEW_MISSION_MATCH: '🎯',
      MISSION_DEADLINE_SOON: '⏰',
      PROFILE_INCOMPLETE: '⚠️',
    };
    return icons[type] || '🔔';
  }

  getTypeClass(type: NotificationType): string {
    const classes: Record<NotificationType, string> = {
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

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onSenderChange(value: string): void {
    this.selectedSender.set(value);
    this.currentPage.set(1);
  }

  onDateChange(value: string): void {
    this.selectedDate.set(value);
    this.currentPage.set(1);
  }
}
