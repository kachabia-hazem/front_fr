import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed = signal(false);
  pendingCount = signal(0);
  pendingFeedbacksCount = signal(0);

  constructor(
    public authService: AuthService,
    private adminService: AdminService,
    private feedbackService: FeedbackService,
    public notificationService: NotificationService,
  ) {}

  ngOnInit() {
    this.adminService.getPendingCompanies().subscribe({
      next: (list) => this.pendingCount.set(list.length),
    });
    this.feedbackService.getPendingFeedbacks().subscribe({
      next: (list) => this.pendingFeedbacksCount.set(list.length),
    });
    this.notificationService.getUnreadCount().subscribe();
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  logout() {
    this.authService.logout();
  }
}
