import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification, NotificationType } from '../../../core/models/notification.model';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-notifications.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNotificationsComponent implements OnInit, OnDestroy {
  loading = signal(true);
  filter = signal<'ALL' | 'UNREAD'>('ALL');
  markingAll = signal(false);

  private langSub?: Subscription;

  constructor(
    public notificationService: NotificationService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {
    // Don't show spinner if we already have cached data
    if (this.notificationService.notifications().length > 0) {
      this.loading.set(false);
    }
  }

  ngOnInit() {
    this.notificationService.getMyNotifications().subscribe({
      next: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });

    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
  }

  displayed = computed(() => {
    const all = this.notificationService.notifications();
    return this.filter() === 'UNREAD' ? all.filter(n => !n.isRead) : all;
  });

  setFilter(f: 'ALL' | 'UNREAD') {
    this.filter.set(f);
  }

  markRead(n: Notification) {
    if (n.isRead) return;
    this.notificationService.markAsRead(n.id).subscribe({
      next: () => this.cdr.markForCheck(),
      error: () => this.cdr.markForCheck(),
    });
  }

  markAllRead() {
    if (this.notificationService.unreadCount() === 0) return;
    this.markingAll.set(true);
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.markingAll.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.markingAll.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  getIcon(type: NotificationType): string {
    switch (type) {
      case 'ADMIN_COMPANY_VERIFICATION_REQUEST': return 'verification';
      case 'ADMIN_NEW_FREELANCER_REGISTERED':    return 'user';
      case 'ADMIN_NEW_CONTRACT_SIGNED':          return 'contract';
      case 'ADMIN_NEW_MISSION_PUBLISHED':        return 'mission';
      default:                                   return 'info';
    }
  }

  getTypeLabel(type: NotificationType): string {
    switch (type) {
      case 'ADMIN_COMPANY_VERIFICATION_REQUEST': return this.translate.instant('admin_notif.type_verification');
      case 'ADMIN_NEW_FREELANCER_REGISTERED':    return this.translate.instant('admin_notif.type_registration');
      case 'ADMIN_NEW_CONTRACT_SIGNED':          return this.translate.instant('admin_notif.type_contract');
      case 'ADMIN_NEW_MISSION_PUBLISHED':        return this.translate.instant('admin_notif.type_mission');
      default:                                   return this.translate.instant('admin_notif.type_info');
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

  getTypeClass(type: NotificationType): string {
    switch (type) {
      case 'ADMIN_COMPANY_VERIFICATION_REQUEST': return 'type-verification';
      case 'ADMIN_NEW_FREELANCER_REGISTERED':    return 'type-user';
      case 'ADMIN_NEW_CONTRACT_SIGNED':          return 'type-contract';
      case 'ADMIN_NEW_MISSION_PUBLISHED':        return 'type-mission';
      default:                                   return 'type-info';
    }
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return this.translate.instant('admin_notif.time_just_now');
    if (m < 60) return this.translate.instant('admin_notif.time_min_ago', { m });
    const h = Math.floor(m / 60);
    if (h < 24) return this.translate.instant('admin_notif.time_hour_ago', { h });
    const d = Math.floor(h / 24);
    if (d < 7)  return this.translate.instant('admin_notif.time_day_ago', { d });
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(dateStr).toLocaleDateString(locale);
  }
}
