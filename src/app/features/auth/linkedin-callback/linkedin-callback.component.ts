import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-linkedin-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      @if (loading) {
        <div class="spinner-wrapper">
          <div class="spinner"></div>
          <p>Connexion avec LinkedIn en cours...</p>
        </div>
      }
      @if (errorMessage) {
        <div class="error-card">
          <p class="error-text">{{ errorMessage }}</p>
          @if (debugUrl) {
            <p class="debug-text">URL: {{ debugUrl }}</p>
          }
          <button class="btn-back" (click)="goToLogin()">Retour au login</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #dce8ec;
    }
    .spinner-wrapper {
      text-align: center;
      color: #374151;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #4e9e92;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-card {
      background: #fff;
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      max-width: 500px;
    }
    .error-text {
      color: #dc2626;
      margin-bottom: 1rem;
    }
    .debug-text {
      color: #6b7280;
      font-size: 0.7rem;
      word-break: break-all;
      margin-bottom: 1rem;
    }
    .btn-back {
      padding: 0.6rem 1.5rem;
      background: #4e9e92;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-back:hover { background: #3793B0; }
  `],
})
export class LinkedInCallbackComponent implements OnInit {
  loading = true;
  errorMessage = '';
  debugUrl = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Try multiple methods to get the code parameter
    let code = this.route.snapshot.queryParamMap.get('code');

    // Fallback: parse from window.location
    if (!code) {
      const urlParams = new URLSearchParams(window.location.search);
      code = urlParams.get('code');
    }

    // Fallback: parse from full href (handles hash routing edge cases)
    if (!code) {
      const match = window.location.href.match(/[?&]code=([^&#]+)/);
      code = match ? decodeURIComponent(match[1]) : null;
    }

    if (!code) {
      this.loading = false;
      this.debugUrl = window.location.href;
      this.errorMessage = 'Paramètres OAuth invalides. Veuillez réessayer.';
      localStorage.removeItem('linkedin_oauth_state');
      return;
    }

    localStorage.removeItem('linkedin_oauth_state');

    this.authService.linkedInLogin({ code }).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.needsRegistration && response.oauthProfile) {
          // New user - redirect to role selection
          sessionStorage.setItem('oauth_profile', JSON.stringify(response.oauthProfile));
          this.router.navigate(['/auth/oauth/role-selection']);
        } else {
          this.authService.setAuthenticated(response);
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la connexion avec LinkedIn.';
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
