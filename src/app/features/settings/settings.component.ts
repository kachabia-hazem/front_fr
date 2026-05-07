import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService, AppLanguage } from '../../core/services/language.service';
import { DeviceService, DeviceSession } from '../../core/services/device.service';
import { environment } from '../../../environments/environment';

type Section = 'password' | 'security' | 'notifications' | 'preferences' | 'payment' | 'delete';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule, TranslateModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnInit, OnDestroy{
  sidebarCollapsed = signal(false);
  activeSection = signal<Section>('password');

  // User info
  sidebarUserName = signal('');
  sidebarUserRole = signal('');
  sidebarUserAvatar = signal<string | undefined>(undefined);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  isFreelancer = computed(() => this.authService.userRole() === 'FREELANCER');
  isCompany = computed(() => this.authService.userRole() === 'COMPANY');

  // ── Password ──
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordLoading = false;
  passwordSuccess = '';
  passwordError = '';
  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  // ── Security ──
  devices = signal<DeviceSession[]>([]);
  disconnectAllLoading = false;
  disconnectSuccess = '';

  // ── Notifications ──
  notifEmailMarketing = signal(true);
  notifEmailUpdates = signal(true);
  notifEmailNewMission = signal(true);
  notifEmailApplication = signal(true);
  notifEmailContract = signal(false);
  notifSaving = false;
  notifSuccess = '';

  // ── Preferences ──
  selectedLanguage = signal<AppLanguage>('en');
  selectedTimezone = signal('Africa/Tunis');
  prefSaving = false;
  prefSuccess = '';

  timezones = [
    { value: 'Africa/Tunis', label: 'Tunis (UTC+1)' },
    { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
    { value: 'Europe/London', label: 'London (UTC+0/+1)' },
    { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
    { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
    { value: 'Asia/Riyadh', label: 'Riyadh (UTC+3)' },
    { value: 'UTC', label: 'UTC' },
  ];

  // ── Delete ──
  deleteConfirmText = '';
  deleteLoading = false;
  deleteError = '';

  private langSub?: Subscription;

    constructor(
  public authService: AuthService,
    private freelancerService: FreelancerService,
    private companyService: CompanyService,
    private notificationService: NotificationService,
    public themeService: ThemeService,
    public languageService: LanguageService,
    private deviceService: DeviceService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.notificationService.getUnreadCount().subscribe();

    // Load saved notification preferences
    this.notifEmailMarketing.set(this.loadNotifPref('wl_notif_marketing', true));
    this.notifEmailUpdates.set(this.loadNotifPref('wl_notif_updates', true));
    this.notifEmailNewMission.set(this.loadNotifPref('wl_notif_new_mission', true));
    this.notifEmailApplication.set(this.loadNotifPref('wl_notif_application', true));
    this.notifEmailContract.set(this.loadNotifPref('wl_notif_contract', false));

    // Load saved language preference and re-apply to translate service
    const savedLang = this.languageService.currentLang();
    this.selectedLanguage.set(savedLang);
    this.languageService.setLanguage(savedLang);

    // Load saved timezone preference
    const savedTz = localStorage.getItem('wl_timezone');
    if (savedTz) this.selectedTimezone.set(savedTz);

    // Restore last active section
    const savedSection = localStorage.getItem('wl_settings_section') as Section | null;
    if (savedSection) this.activeSection.set(savedSection);

    // Load real devices
    this.devices.set(this.deviceService.getSessions());

    if (this.isFreelancer()) {
      this.freelancerService.getMyProfile().subscribe({
        next: (p) => {
          this.sidebarUserName.set(`${p.firstName || ''} ${p.lastName || ''}`.trim());
          this.sidebarUserRole.set(p.currentPosition || 'Freelancer');
          this.sidebarUserAvatar.set(p.profilePicture);
        },
      });
    } else {
      this.companyService.getMyProfile().subscribe({
        next: (c: any) => {
          this.sidebarUserName.set(c.companyName || c.name || 'Company');
          this.sidebarUserRole.set('Company');
          this.sidebarUserAvatar.set(c.companyLogo);
        },
      });
    }
  }

  setSection(s: Section): void {
    this.activeSection.set(s);
    localStorage.setItem('wl_settings_section', s);
    this.passwordSuccess = '';
    this.passwordError = '';
    this.disconnectSuccess = '';
    this.notifSuccess = '';
    this.prefSuccess = '';
    this.deleteError = '';
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  get sidebarInitials(): string {
    return this.sidebarUserName()
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // ── Password ──
  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';
    const lang = this.languageService.currentLang();
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = this.translate.instant('settings.password.error_empty');
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError = this.translate.instant('settings.password.error_length');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = this.translate.instant('settings.password.error_match');
      return;
    }
    this.passwordLoading = true;
    setTimeout(() => {
      this.passwordLoading = false;
      this.passwordSuccess = this.translate.instant('settings.password.success');
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    }, 1200);
  }

  get passwordStrength(): { label: string; level: number } {
    const p = this.newPassword;
    if (!p) return { label: '', level: 0 };
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const keys = ['', 'settings.password.strength.weak', 'settings.password.strength.fair',
                  'settings.password.strength.good', 'settings.password.strength.strong'];
    if (score <= 1) return { label: this.translate.instant(keys[1]), level: 1 };
    if (score <= 3) return { label: this.translate.instant(keys[2]), level: 2 };
    if (score <= 4) return { label: this.translate.instant(keys[3]), level: 3 };
    return { label: this.translate.instant(keys[4]), level: 4 };
  }

  // ── Security ──
  disconnectDevice(id: string): void {
    this.deviceService.removeSession(id);
    this.devices.set(this.deviceService.getSessions());
  }

  disconnectAll(): void {
    this.disconnectAllLoading = true;
    setTimeout(() => {
      this.deviceService.removeOtherSessions();
      this.devices.set(this.deviceService.getSessions());
      this.disconnectAllLoading = false;
      this.disconnectSuccess = this.translate.instant('settings.security.success');
    }, 800);
  }

  formatLastSeen(dev: DeviceSession): string {
    return this.deviceService.formatLastSeen(dev);
  }

  isMobileDevice(os: string): boolean {
    return os.includes('iOS') || os.includes('Android') || os.includes('iPadOS');
  }

  // ── Notifications ──
  private loadNotifPref(key: string, defaultValue: boolean): boolean {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored === 'true' : defaultValue;
  }

  saveNotifications(): void {
    this.notifSaving = true;
    this.notifSuccess = '';
    localStorage.setItem('wl_notif_marketing', String(this.notifEmailMarketing()));
    localStorage.setItem('wl_notif_updates', String(this.notifEmailUpdates()));
    localStorage.setItem('wl_notif_new_mission', String(this.notifEmailNewMission()));
    localStorage.setItem('wl_notif_application', String(this.notifEmailApplication()));
    localStorage.setItem('wl_notif_contract', String(this.notifEmailContract()));
    setTimeout(() => {
      this.notifSaving = false;
      this.notifSuccess = this.translate.instant('settings.notifications.success');
    }, 800);
  }

  // ── Preferences ──
  savePreferences(): void {
    this.prefSaving = true;
    this.prefSuccess = '';
    this.languageService.setLanguage(this.selectedLanguage());
    localStorage.setItem('wl_timezone', this.selectedTimezone());
    setTimeout(() => {
      this.prefSaving = false;
      this.prefSuccess = this.translate.instant('settings.preferences.success');
    }, 500);
  }

  // ── Delete ──
  get deleteConfirmKeyword(): string {
    return this.translate.instant('settings.delete.confirm_keyword');
  }

  get deleteConfirmValid(): boolean {
    return this.deleteConfirmText.toLowerCase() === this.deleteConfirmKeyword;
  }

  deleteAccount(): void {
    if (!this.deleteConfirmValid) return;
    this.deleteLoading = true;
    this.deleteError = '';
    setTimeout(() => {
      this.deleteLoading = false;
      this.authService.logout();
    }, 1500);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
