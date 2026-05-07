import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;
  googleLoading = false;

  @ViewChild('googleBtn', { static: false }) googleBtn!: ElementRef;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      agreeTerms: [false, [Validators.requiredTrue]],
    });
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('reset') === 'true') {
      this.successMessage = 'Password reset successfully. You can now log in.';
    }
  }

  ngAfterViewInit(): void {
    this.initializeGoogle();
  }

  private initializeGoogle(): void {
    if (typeof google === 'undefined') {
      // Google SDK not loaded yet, retry after a short delay
      setTimeout(() => this.initializeGoogle(), 500);
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: GoogleCredentialResponse) => {
        this.ngZone.run(() => this.handleGoogleResponse(response));
      },
    });

    if (this.googleBtn?.nativeElement) {
      google.accounts.id.renderButton(this.googleBtn.nativeElement, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 380,
      });
    }
  }

  private handleGoogleResponse(response: GoogleCredentialResponse): void {
    this.googleLoading = true;
    this.errorMessage = '';

    this.authService.googleLogin({ idToken: response.credential }).subscribe({
      next: (authResponse) => {
        this.googleLoading = false;

        if (authResponse.needsRegistration && authResponse.oauthProfile) {
          // New user - redirect to role selection
          sessionStorage.setItem('oauth_profile', JSON.stringify(authResponse.oauthProfile));
          this.router.navigate(['/auth/oauth/role-selection']);
        } else {
          // Existing user - save auth and redirect
          this.authService.setAuthenticated(authResponse);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (err) => {
        this.googleLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la connexion avec Google.';
      },
    });
  }

  loginWithLinkedIn(): void {
    const clientId = environment.linkedInClientId;
    const redirectUri = encodeURIComponent(environment.linkedInRedirectUri);
    const scope = encodeURIComponent('openid profile email');
    const state = this.generateRandomState();

    localStorage.setItem('linkedin_oauth_state', state);

    const linkedInAuthUrl =
      `https://www.linkedin.com/oauth/v2/authorization` +
      `?response_type=code` +
      `&client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=${scope}` +
      `&state=${state}`;

    window.location.href = linkedInAuthUrl;
  }

  private generateRandomState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        if (res.role === 'ADMIN') {
          this.router.navigate(['/admin/overview']);
          return;
        }
        if (res.role === 'COMPANY' && res.verificationStatus !== 'APPROVED') {
          // Company not yet approved — do NOT store token, redirect to review page
          this.authService.clearAuth();
          this.router.navigate(['/auth/company-under-review'], {
            state: { status: res.verificationStatus ?? 'PENDING' }
          });
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 403 && err.error?.message) {
          this.authService.clearAuth();
          this.router.navigate(['/auth/banned'], {
            state: {
              banReason: err.error.banReason ?? '',
              userId: err.error.userId ?? '',
              userType: err.error.userType ?? '',
              email: email,
            },
          });
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.error?.error) {
          this.errorMessage = err.error.error;
        } else {
          this.errorMessage = 'Email ou mot de passe incorrect.';
        }
      },
    });
  }
}
