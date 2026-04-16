import { Injectable, signal } from '@angular/core';

export interface DeviceSession {
  id: string;
  name: string;
  os: string;
  browser: string;
  location: string;
  lastSeen: string;
  current: boolean;
  loginTime: number;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly STORAGE_KEY = 'wl_sessions';

  /** Detect OS from userAgent */
  private detectOS(ua: string): string {
    if (/Windows NT 11/.test(ua) || /Windows NT 10/.test(ua)) return 'Windows 11/10';
    if (/Windows NT 6.3/.test(ua)) return 'Windows 8.1';
    if (/Windows/.test(ua)) return 'Windows';
    if (/iPhone/.test(ua)) return 'iOS';
    if (/iPad/.test(ua)) return 'iPadOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown OS';
  }

  /** Detect browser from userAgent */
  private detectBrowser(ua: string): string {
    if (/Edg\//.test(ua)) return 'Edge ' + (ua.match(/Edg\/([\d.]+)/)?.[1]?.split('.')[0] ?? '');
    if (/OPR\//.test(ua)) return 'Opera ' + (ua.match(/OPR\/([\d.]+)/)?.[1]?.split('.')[0] ?? '');
    if (/Firefox\//.test(ua)) return 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/)?.[1]?.split('.')[0] ?? '');
    if (/SamsungBrowser\//.test(ua)) return 'Samsung Browser';
    if (/Chrome\//.test(ua)) return 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/)?.[1]?.split('.')[0] ?? '');
    if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari ' + (ua.match(/Version\/([\d.]+)/)?.[1]?.split('.')[0] ?? '');
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Unknown Browser';
  }

  /** Detect device name */
  private detectDeviceName(ua: string, os: string): string {
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua) && /Mobile/.test(ua)) return 'Android Phone';
    if (/Android/.test(ua)) return 'Android Tablet';
    if (os.includes('macOS')) return 'Mac';
    if (os.includes('Windows')) return 'Windows PC';
    if (os.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  }

  /** Build a session entry for the current browser */
  buildCurrentSession(): DeviceSession {
    const ua = navigator.userAgent;
    const os = this.detectOS(ua);
    const browser = this.detectBrowser(ua);
    const name = this.detectDeviceName(ua, os);

    return {
      id: this.generateId(),
      name,
      os,
      browser,
      location: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      lastSeen: 'Active now',
      current: true,
      loginTime: Date.now(),
    };
  }

  /** Load sessions from localStorage, injecting the current one */
  getSessions(): DeviceSession[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    let sessions: DeviceSession[] = raw ? JSON.parse(raw) : [];

    // Remove stale "current" markers from stored sessions
    sessions = sessions.map(s => ({ ...s, current: false }));

    // Check if current session ID is already stored
    const currentId = this.getCurrentSessionId();
    const exists = sessions.find(s => s.id === currentId);

    if (!exists) {
      const current = this.buildCurrentSession();
      current.id = currentId;
      sessions.unshift(current);
      this.saveSessions(sessions);
    } else {
      // Update lastSeen for current
      exists.current = true;
      exists.lastSeen = 'Active now';
      this.saveSessions(sessions);
    }

    // Mark the current one
    return sessions.map(s => ({ ...s, current: s.id === currentId }));
  }

  /** Register a new login session (call on successful login) */
  registerLogin(): void {
    const sessions = this.getSessions();
    this.saveSessions(sessions);
  }

  /** Remove a specific session */
  removeSession(id: string): void {
    const sessions = this.getSessions().filter(s => s.id !== id);
    this.saveSessions(sessions);
  }

  /** Remove all sessions except current */
  removeOtherSessions(): void {
    const currentId = this.getCurrentSessionId();
    const sessions = this.getSessions().filter(s => s.id === currentId);
    this.saveSessions(sessions);
  }

  /** Format last seen time */
  formatLastSeen(session: DeviceSession): string {
    if (session.current) return 'Active now';
    const diff = Date.now() - session.loginTime;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private saveSessions(sessions: DeviceSession[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  private getCurrentSessionId(): string {
    const key = 'wl_session_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = this.generateId();
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
