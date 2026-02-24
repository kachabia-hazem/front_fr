import { Component, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { FreelancerService } from '../../../core/services/freelancer.service';
import { CompanyService } from '../../../core/services/company.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Freelancer, Company } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  company = signal<Company | null>(null);
  showDropdown = false;
  unreadNotifCount = signal(0);

  // Profile completion percentage
  get profileCompletion(): number {
    const f = this.freelancer();
    const c = this.company();

    if (f) {
      return this.calculateFreelancerCompletion(f);
    }
    if (c) {
      return this.calculateCompanyCompletion(c);
    }
    return 0;
  }

  get isProfileComplete(): boolean {
    return this.profileCompletion >= 100;
  }

  private calculateFreelancerCompletion(f: Freelancer): number {
    const fields = [
      { value: f.firstName, weight: 10 },
      { value: f.lastName, weight: 10 },
      { value: f.gender, weight: 5 },
      { value: f.dateOfBirth, weight: 5 },
      { value: f.phoneNumber, weight: 10 },
      { value: f.profileTypes?.length, weight: 10 },
      { value: f.tjm, weight: 5 },
      { value: f.languages?.length, weight: 5 },
      { value: f.profilePicture, weight: 10 },
      { value: f.bio, weight: 10 },
      { value: f.skills?.length, weight: 10 },
      { value: f.currentPosition, weight: 5 },
      { value: f.location, weight: 5 },
    ];

    let completed = 0;
    let total = 0;

    for (const field of fields) {
      total += field.weight;
      if (field.value) {
        completed += field.weight;
      }
    }

    return Math.round((completed / total) * 100);
  }

  private calculateCompanyCompletion(c: Company): number {
    const fields = [
      { value: c.companyName, weight: 15 },
      { value: c.address, weight: 10 },
      { value: c.legalForm, weight: 10 },
      { value: c.tradeRegister, weight: 10 },
      { value: c.foundationDate, weight: 5 },
      { value: c.businessSector, weight: 10 },
      { value: c.managerName, weight: 10 },
      { value: c.managerEmail, weight: 5 },
      { value: c.managerPosition, weight: 5 },
      { value: c.managerPhoneNumber, weight: 5 },
      { value: c.companyLogo, weight: 10 },
      { value: c.description, weight: 5 },
    ];

    let completed = 0;
    let total = 0;

    for (const field of fields) {
      total += field.weight;
      if (field.value) {
        completed += field.weight;
      }
    }

    return Math.round((completed / total) * 100);
  }

  // SVG circle properties for progress ring
  get progressCircumference(): number {
    return 2 * Math.PI * 22; // radius = 22
  }

  get progressOffset(): number {
    const progress = this.profileCompletion / 100;
    return this.progressCircumference * (1 - progress);
  }

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private freelancerService: FreelancerService,
    private companyService: CompanyService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      const role = this.authService.currentUser()?.role;

      if (role === 'FREELANCER') {
        this.freelancerService.getMyProfile().subscribe({
          next: (profile) => this.freelancer.set(profile),
          error: () => {},
        });
        this.notificationService.getUnreadCount().subscribe({
          next: (res) => this.unreadNotifCount.set(res.count),
          error: () => {},
        });
      } else if (role === 'COMPANY') {
        this.companyService.getMyProfile().subscribe({
          next: (profile) => this.company.set(profile),
          error: () => {},
        });
      }
    }
  }

  get initials(): string {
    const f = this.freelancer();
    const c = this.company();

    if (f) {
      return ((f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')).toUpperCase();
    }
    if (c && c.companyName) {
      return c.companyName.charAt(0).toUpperCase();
    }
    return '?';
  }

  get displayName(): string {
    const f = this.freelancer();
    const c = this.company();

    if (f) {
      return `${f.firstName || ''} ${f.lastName || ''}`.trim();
    }
    if (c) {
      return c.companyName || '';
    }
    return '';
  }

  get displayEmail(): string {
    const f = this.freelancer();
    const c = this.company();

    if (f) {
      return f.email || '';
    }
    if (c) {
      return c.email || '';
    }
    return this.authService.currentUser()?.email || '';
  }

  get profilePicture(): string | undefined {
    const f = this.freelancer();
    const c = this.company();

    if (f) {
      return f.profilePicture;
    }
    if (c) {
      return c.companyLogo;
    }
    return undefined;
  }

  get isFreelancer(): boolean {
    return this.authService.currentUser()?.role === 'FREELANCER';
  }

  get isCompany(): boolean {
    return this.authService.currentUser()?.role === 'COMPANY';
  }

  get hasProfile(): boolean {
    return !!this.freelancer() || !!this.company();
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.showDropdown = false;
  }

  logout(): void {
    this.showDropdown = false;
    this.authService.logout();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
