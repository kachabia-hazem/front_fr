import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, HighlightPipe],
  templateUrl: './company-notifications.component.html',
  styleUrl: './company-notifications.component.css',
})
export class CompanyNotificationsComponent implements OnInit {
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

  constructor(
    private notificationService: NotificationService,
    private companyService: CompanyService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.companyService.getMyProfile().subscribe({
      next: (profile) => this.company.set(profile),
    });
    this.loadNotifications();
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

  setFilterType(type: FilterType): void { this.filterType.set(type); }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterType.set('all');
    this.selectedSender.set('');
    this.selectedDate.set('');
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  goBack(): void { this.router.navigate(['/company-dashboard']); }

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

  onSearchChange(value: string): void { this.searchQuery.set(value); }
  onSenderChange(value: string): void { this.selectedSender.set(value); }
  onDateChange(value: string): void { this.selectedDate.set(value); }
}
