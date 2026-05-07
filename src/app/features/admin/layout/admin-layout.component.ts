import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { LegitService } from '../../../core/services/legit.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Notification, NotificationType } from '../../../core/models/notification.model';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, TranslateModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css'],
})
export class AdminLayoutComponent implements OnInit, OnDestroy{
  sidebarCollapsed  = signal(false);
  pendingCount      = signal(0);
  pendingFeedbacksCount = signal(0);
  pendingLegitsCount = signal(0);
  notifPanelOpen    = signal(false);
  notifLoading      = signal(false);

  recentNotifications = computed(() =>
    this.notificationService.notifications().slice(0, 8)
  );

  private langSub?: Subscription;

    constructor(
  public authService: AuthService,
    private adminService: AdminService,
    private feedbackService: FeedbackService,
    private legitService: LegitService,
    public notificationService: NotificationService,
    public themeService: ThemeService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.adminService.getPendingCompanies().subscribe({
      next: (list) => this.pendingCount.set(list.length),
    });
    this.feedbackService.getPendingFeedbacks().subscribe({
      next: (list) => this.pendingFeedbacksCount.set(list.length),
    });
    this.legitService.getStats().subscribe({
      next: (stats) => this.pendingLegitsCount.set(stats['EN_ATTENTE'] ?? 0),
    });
    this.notifLoading.set(true);
    this.notificationService.getMyNotifications().subscribe({
      complete: () => this.notifLoading.set(false),
      error: () => this.notifLoading.set(false),
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleNotifPanel(): void {
    const opening = !this.notifPanelOpen();
    this.notifPanelOpen.update(v => !v);
    if (opening) {
      this.notifLoading.set(true);
      this.notificationService.getMyNotifications().subscribe({
        complete: () => this.notifLoading.set(false),
        error: () => this.notifLoading.set(false),
      });
    }
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
  }


  getNotifTitle(n: Notification): string {
    switch (n.type) {
      case 'ADMIN_COMPANY_VERIFICATION_REQUEST': return 'New Verification Request';
      case 'ADMIN_NEW_FREELANCER_REGISTERED':    return 'New Freelancer Registered';
      case 'ADMIN_NEW_CONTRACT_SIGNED':          return 'Contract Signed';
      case 'ADMIN_NEW_MISSION_PUBLISHED':        return 'New Mission Published';
      case 'CONTRACT_CANCELLED_BY_ADMIN':        return 'Contract Cancelled';
      case 'MISSION_DELETED_BY_ADMIN':           return 'Mission Deleted';
      case 'COMPANY_APPROVED':                   return 'Company Approved';
      case 'COMPANY_REJECTED':                   return 'Company Rejected';
      case 'MISSION_VALIDATED':                  return 'Mission Validated';
      case 'MISSION_ACTIVATED':                  return 'Mission Activated';
      case 'FEEDBACK_VALIDATED':                 return 'Feedback Validated';
      case 'FEEDBACK_REJECTED':                  return 'Feedback Rejected';
      default:                                   return n.title;
    }
  }

  getNotifMessage(n: Notification): string {
    const name = n.senderName || 'Unknown';
    switch (n.type) {
      case 'ADMIN_COMPANY_VERIFICATION_REQUEST': return `${name} is waiting for account verification.`;
      case 'ADMIN_NEW_FREELANCER_REGISTERED':    return `${name} has joined the platform as a freelancer.`;
      case 'ADMIN_NEW_CONTRACT_SIGNED':          return `A new contract has been signed between ${name}.`;
      case 'ADMIN_NEW_MISSION_PUBLISHED':        return `${name} published a new mission awaiting validation.`;
      case 'CONTRACT_CANCELLED_BY_ADMIN':        return 'A contract has been cancelled by an administrator.';
      case 'MISSION_DELETED_BY_ADMIN':           return 'A mission has been deleted by an administrator.';
      case 'COMPANY_APPROVED':                   return `${name}'s company account has been approved.`;
      case 'COMPANY_REJECTED':                   return `${name}'s company account has been rejected.`;
      case 'MISSION_VALIDATED':                  return 'A mission has been validated and is now active.';
      case 'MISSION_ACTIVATED':                  return 'A mission has been activated successfully.';
      case 'FEEDBACK_VALIDATED':                 return 'A feedback has been validated.';
      case 'FEEDBACK_REJECTED':                  return 'A feedback has been rejected.';
      default:                                   return n.message;
    }
  }

  logout() {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
