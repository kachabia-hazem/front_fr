import { Component, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { FreelancerService } from '../../../core/services/freelancer.service';
import { CompanyService } from '../../../core/services/company.service';
import { Freelancer, Company } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  company = signal<Company | null>(null);
  showDropdown = false;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private freelancerService: FreelancerService,
    private companyService: CompanyService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      const role = this.authService.currentUser()?.role;

      if (role === 'FREELANCER') {
        this.freelancerService.getMyProfile().subscribe({
          next: (profile) => this.freelancer.set(profile),
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
