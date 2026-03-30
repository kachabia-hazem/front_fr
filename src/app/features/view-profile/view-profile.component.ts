import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FreelancerService } from '../../core/services/freelancer.service';
import { AuthService } from '../../core/services/auth.service';
import { Freelancer, Review } from '../../core/models';
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

  reviews = signal<Review[]>([]);
  showReviews = signal(true);

  // Sections dépliables
  showWorkExperience = signal(true);
  showProjects = signal(true);
  showCertifications = signal(true);
  showEducation = signal(true);
  showSkills = signal(true);
  showLanguages = signal(true);

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
        if (!this.isOwnProfile()) {
          this.freelancerService.recordProfileView(id).subscribe();
        }
        this.loading.set(false);
        this.loadReviews(id);
      },
      error: () => {
        this.error.set('Freelancer not found');
        this.loading.set(false);
      },
    });
  }

  private loadReviews(id: string): void {
    this.freelancerService.getFreelancerReviews(id).subscribe({
      next: (reviews) => this.reviews.set(reviews),
      error: () => {},
    });
  }

  private loadOwnProfile(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (freelancer) => {
        this.freelancer.set(freelancer);
        this.isOwnProfile.set(true);
        this.loading.set(false);
        this.loadReviews(freelancer.id);
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
      case 'projects':
        this.showProjects.set(!this.showProjects());
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
      case 'languages':
        this.showLanguages.set(!this.showLanguages());
        break;
      case 'reviews':
        this.showReviews.set(!this.showReviews());
        break;
    }
  }

  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getCompanyLogoUrl(logo: string | undefined): string {
    if (!logo) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + logo;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  }
}
