import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification, NotificationType } from '../../../core/models/notification.model';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-notifications.component.css'],
})
export class AdminNotificationsComponent implements OnInit {
  loading = signal(true);
  filter = signal<'ALL' | 'UNREAD'>('ALL');

  constructor(
    public notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.notificationService.getMyNotifications().subscribe({
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  get displayed(): Notification[] {
    const all = this.notificationService.notifications();
    return this.filter() === 'UNREAD' ? all.filter(n => !n.isRead) : all;
  }

  setFilter(f: 'ALL' | 'UNREAD') {
    this.filter.set(f);
  }

  markRead(n: Notification) {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.id).subscribe();
    }
    if (n.actionUrl) {
      this.router.navigateByUrl(n.actionUrl);
    }
  }

  markAllRead() {
    this.notificationService.markAllAsRead().subscribe();
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
      case 'ADMIN_COMPANY_VERIFICATION_REQUEST': return 'Vérification';
      case 'ADMIN_NEW_FREELANCER_REGISTERED':    return 'Inscription';
      case 'ADMIN_NEW_CONTRACT_SIGNED':          return 'Contrat';
      case 'ADMIN_NEW_MISSION_PUBLISHED':        return 'Mission';
      default:                                   return 'Info';
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
    if (m < 1)  return 'À l\'instant';
    if (m < 60) return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `Il y a ${d}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }
}
