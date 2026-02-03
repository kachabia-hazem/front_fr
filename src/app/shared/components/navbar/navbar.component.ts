import { Component, OnInit, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { FreelancerService } from '../../../core/services/freelancer.service';
import { Freelancer } from '../../../core/models';
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
  showDropdown = false;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private freelancerService: FreelancerService,
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated() && this.authService.currentUser()?.role === 'FREELANCER') {
      this.freelancerService.getMyProfile().subscribe({
        next: (profile) => this.freelancer.set(profile),
        error: () => {},
      });
    }
  }

  get initials(): string {
    const f = this.freelancer();
    if (!f) return '?';
    return (
      (f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')
    ).toUpperCase();
  }

  get displayName(): string {
    const f = this.freelancer();
    if (!f) return '';
    return `${f.firstName || ''} ${f.lastName || ''}`.trim();
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
