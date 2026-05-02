import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { LegitService } from '../../../core/services/legit.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Notification } from '../../../core/models/notification.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed  = signal(false);
  pendingCount      = signal(0);
  pendingFeedbacksCount = signal(0);
  pendingLegitsCount = signal(0);
  notifPanelOpen    = signal(false);

  recentNotifications = computed(() =>
    this.notificationService.notifications().slice(0, 8)
  );

  constructor(
    public authService: AuthService,
    private adminService: AdminService,
    private feedbackService: FeedbackService,
    private legitService: LegitService,
    public notificationService: NotificationService,
    public themeService: ThemeService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.adminService.getPendingCompanies().subscribe({
      next: (list) => this.pendingCount.set(list.length),
    });
    this.feedbackService.getPendingFeedbacks().subscribe({
      next: (list) => this.pendingFeedbacksCount.set(list.length),
    });
    this.legitService.getStats().subscribe({
      next: (stats) => this.pendingLegitsCount.set(stats['EN_ATTENTE'] ?? 0),
    });
    this.notificationService.getUnreadCount().subscribe();
    this.notificationService.getMyNotifications().subscribe();
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleNotifPanel(): void {
    this.notifPanelOpen.update(v => !v);
  }

  closeNotifPanel(): void {
    this.notifPanelOpen.set(false);
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  openNotif(notif: Notification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id).subscribe();
    }
    this.notifPanelOpen.set(false);
    this.router.navigate(['/admin/notifications']);
  }

  viewAllNotifications(): void {
    this.notifPanelOpen.set(false);
    this.router.navigate(['/admin/notifications']);
  }

  logout() {
    this.authService.logout();
  }
}
