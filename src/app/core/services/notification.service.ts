import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  /** Shared singleton signal — source of truth for the unread badge across all pages */
  readonly unreadCount = signal(0);

  /** Shared singleton signal — persists the notifications list across navigation */
  readonly notifications = signal<Notification[]>([]);

  /**
   * IDs marked as read locally (before or after API response).
   * Used to override stale server data when re-fetching after a race condition.
   */
  private readonly _localReadIds = new Set<string>();

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/my`).pipe(
      tap(list => {
        // Apply local read state on top of server response to handle race conditions:
        // if markAsRead was in-flight when the user navigated, the server might still
        // return the notification as unread — we override that with our local tracking.
        const merged = list.map(n =>
          this._localReadIds.has(n.id) ? { ...n, isRead: true } : n,
        );
        this.notifications.set(merged);
        this.unreadCount.set(merged.filter(n => !n.isRead).length);
      }),
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(res => this.unreadCount.set(res.count)),
    );
  }

  markAsRead(notificationId: string): Observable<void> {
    // Track immediately (synchronous) — before the API responds.
    // This ensures that even if the component is destroyed before the response
    // arrives, the next getMyNotifications() call will still apply the read state.
    this._localReadIds.add(notificationId);
    return this.http.patch<void>(`${this.apiUrl}/${notificationId}/read`, null).pipe(
      tap(() => {
        this.unreadCount.update(c => Math.max(0, c - 1));
        this.notifications.update(list =>
          list.map(n => n.id === notificationId ? { ...n, isRead: true } : n),
        );
      }),
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/read-all`, null).pipe(
      tap(() => {
        this.unreadCount.set(0);
        this.notifications().forEach(n => this._localReadIds.add(n.id));
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      }),
    );
  }
}
