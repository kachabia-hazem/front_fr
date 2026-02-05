import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FreelancerService } from '../../core/services/freelancer.service';
import { AuthService } from '../../core/services/auth.service';
import { Freelancer } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-view-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-profile.component.html',
  styleUrl: './view-profile.component.css',
})
export class ViewProfileComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  loading = signal(true);
  error = signal('');
  isOwnProfile = signal(false);

  // Sections dépliables
  showWorkExperience = signal(true);
  showCertifications = signal(false);
  showEducation = signal(false);
  showSkills = signal(false);

  constructor(
    private route: ActivatedRoute,
    private freelancerService: FreelancerService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadFreelancer(id);
    } else {
      // Si pas d'ID, charger son propre profil
      this.loadOwnProfile();
    }
  }

  private loadFreelancer(id: string): void {
    this.freelancerService.getFreelancerById(id).subscribe({
      next: (freelancer) => {
        this.freelancer.set(freelancer);
        this.checkIfOwnProfile(freelancer);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Freelancer not found');
        this.loading.set(false);
      },
    });
  }

  private loadOwnProfile(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (freelancer) => {
        this.freelancer.set(freelancer);
        this.isOwnProfile.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load profile');
        this.loading.set(false);
      },
    });
  }

  private checkIfOwnProfile(freelancer: Freelancer): void {
    const currentUser = this.authService.currentUser();
    if (currentUser && currentUser.email === freelancer.email) {
      this.isOwnProfile.set(true);
    }
  }

  get fullName(): string {
    const f = this.freelancer();
    if (!f) return '';
    return `${f.firstName || ''} ${f.lastName || ''}`.trim();
  }

  get initials(): string {
    const f = this.freelancer();
    if (!f) return '?';
    return (
      (f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')
    ).toUpperCase();
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  formatEnumLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  toggleSection(section: string): void {
    switch (section) {
      case 'workExperience':
        this.showWorkExperience.set(!this.showWorkExperience());
        break;
      case 'certifications':
        this.showCertifications.set(!this.showCertifications());
        break;
      case 'education':
        this.showEducation.set(!this.showEducation());
        break;
      case 'skills':
        this.showSkills.set(!this.showSkills());
        break;
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  }
}
