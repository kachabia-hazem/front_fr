import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OAuthProfile, OAuthCompleteRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-oauth-role-selection',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="role-page">
      <div class="role-card">
        @if (profile) {
          <div class="profile-info">
            @if (profile.picture) {
              <img [src]="profile.picture" alt="Profile picture" />
            }
            <h3>{{ profile.firstName }} {{ profile.lastName }}</h3>
            <p>{{ profile.email }}</p>
            <span class="provider-badge" [class]="profile.provider.toLowerCase()">
              {{ profile.provider === 'GOOGLE' ? 'Google' : 'LinkedIn' }}
            </span>
          </div>
        }

        <h2>Choisissez votre profil</h2>
        <p class="subtitle">Sélectionnez le type de compte que vous souhaitez créer</p>

        @if (errorMessage) {
          <div class="error-message">{{ errorMessage }}</div>
        }

        <div class="role-options">
          <button class="role-btn" (click)="selectRole('FREELANCER')" [disabled]="loading">
            <span class="role-icon">👨‍💻</span>
            <h4>Freelancer</h4>
            <p>Je cherche des missions</p>
          </button>

          <button class="role-btn" (click)="selectRole('COMPANY')" [disabled]="loading">
            <span class="role-icon">🏢</span>
            <h4>Entreprise</h4>
            <p>Je recrute des talents</p>
          </button>
        </div>

        @if (loading) {
          <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Création de votre compte...</p>
          </div>
        }

        <button class="btn-back" (click)="goBack()" [disabled]="loading">
          ← Retour à la connexion
        </button>
      </div>
    </div>
  `,
  styles: [`
    .role-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #dce8ec;
    }
    .role-card {
      background: #fff;
      border-radius: 1.25rem;
      padding: 2.5rem;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      text-align: center;
    }
    .profile-info {
      margin-bottom: 1.5rem;
    }
    .profile-info img {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin-bottom: 0.75rem;
    }
    .profile-info h3 {
      margin: 0;
      color: #1a1a2e;
      font-size: 1.1rem;
    }
    .profile-info p {
      color: #6b7280;
      font-size: 0.85rem;
      margin: 0.25rem 0 0.5rem;
    }
    .provider-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .provider-badge.google {
      background: #fef2f2;
      color: #dc2626;
    }
    .provider-badge.linkedin {
      background: #eff6ff;
      color: #2563eb;
    }
    h2 {
      font-size: 1.5rem;
      color: #1a1a2e;
      margin: 0 0 0.5rem;
    }
    .subtitle {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .error-message {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      padding: 0.6rem 0.8rem;
      font-size: 0.82rem;
      margin-bottom: 1rem;
    }
    .role-options {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .role-btn {
      flex: 1;
      padding: 1.5rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 1rem;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s;
    }
    .role-btn:hover:not(:disabled) {
      border-color: #4e9e92;
      background: #f0fdf4;
    }
    .role-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .role-btn h4 {
      margin: 0.75rem 0 0.25rem;
      color: #1a1a2e;
      font-size: 1rem;
    }
    .role-btn p {
      margin: 0;
      color: #6b7280;
      font-size: 0.8rem;
    }
    .role-icon {
      font-size: 2rem;
    }
    .loading-indicator {
      margin-top: 1.5rem;
      text-align: center;
    }
    .loading-indicator p {
      color: #6b7280;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #4e9e92;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn-back {
      display: block;
      text-align: center;
      margin-top: 1.5rem;
      color: #4e9e92;
      font-size: 0.85rem;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
    }
    .btn-back:hover:not(:disabled) { text-decoration: underline; }
    .btn-back:disabled { opacity: 0.55; cursor: not-allowed; }
  `],
})
export class OAuthRoleSelectionComponent implements OnInit {
  profile: OAuthProfile | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const data = sessionStorage.getItem('oauth_profile');
    if (!data) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.profile = JSON.parse(data);
  }

  selectRole(role: 'FREELANCER' | 'COMPANY'): void {
    if (!this.profile) return;

    this.loading = true;
    this.errorMessage = '';

    const request: OAuthCompleteRequest = {
      role,
      email: this.profile.email,
      providerId: this.profile.providerId,
      provider: this.profile.provider,
      firstName: this.profile.firstName,
      lastName: this.profile.lastName,
      profilePicture: this.profile.picture,
    };

    this.authService.oauthCompleteRegistration(request).subscribe({
      next: () => {
        sessionStorage.removeItem('oauth_profile');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || "Erreur lors de la création du compte.";
      },
    });
  }

  goBack(): void {
    sessionStorage.removeItem('oauth_profile');
    this.router.navigate(['/auth/login']);
  }
}
