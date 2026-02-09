import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import {
  RegisterFreelancerRequest,
  RegisterCompanyRequest,
} from '../../../../core/models';

@Component({
  selector: 'app-register-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './register-verify.component.html',
  styleUrl: './register-verify.component.css',
})
export class RegisterVerifyComponent implements OnInit {
  role: 'freelancer' | 'company' = 'freelancer';
  savedData: any = null;

  emailForm: FormGroup;
  errorMessage = '';
  loading = false;

  // Email verification state
  emailVerified = false;
  verificationSent = false;
  verificationCode = '';
  verificationLoading = false;
  verificationError = '';
  cooldownSeconds = 0;
  private cooldownInterval: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    // Load saved data from sessionStorage
    const savedRole = sessionStorage.getItem('register_role');
    const savedData = sessionStorage.getItem('register_data');

    if (!savedRole || !savedData) {
      // No data found, redirect back to register page
      this.router.navigate(['/auth/register']);
      return;
    }

    this.role = savedRole as 'freelancer' | 'company';
    try {
      this.savedData = JSON.parse(savedData);
    } catch {
      this.router.navigate(['/auth/register']);
    }
  }

  get currentEmailValue(): string {
    return this.emailForm.get('email')?.value || '';
  }

  sendVerificationCode(): void {
    const email = this.currentEmailValue;
    const emailControl = this.emailForm.get('email');

    if (!email || emailControl?.invalid) {
      this.verificationError = 'Please enter a valid email address.';
      return;
    }

    this.verificationLoading = true;
    this.verificationError = '';

    this.authService.sendVerificationCode(email).subscribe({
      next: () => {
        this.verificationSent = true;
        this.verificationLoading = false;
        this.startCooldown();
      },
      error: (err) => {
        this.verificationLoading = false;
        this.verificationError = err.error?.message || 'Failed to send verification code.';
      },
    });
  }

  submitVerificationCode(): void {
    const email = this.currentEmailValue;
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.verificationError = 'Please enter the 6-digit code.';
      return;
    }

    this.verificationLoading = true;
    this.verificationError = '';

    this.authService.verifyCode(email, this.verificationCode).subscribe({
      next: (res) => {
        this.verificationLoading = false;
        if (res.verified) {
          this.emailVerified = true;
          this.verificationError = '';
        } else {
          this.verificationError = 'Invalid code. Please try again.';
        }
      },
      error: (err) => {
        this.verificationLoading = false;
        this.verificationError = err.error?.message || 'Verification failed.';
      },
    });
  }

  private startCooldown(): void {
    this.cooldownSeconds = 60;
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSeconds <= 0) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }

  onSubmit(): void {
    if (!this.emailVerified) {
      this.errorMessage = 'Please verify your email address before registering.';
      return;
    }

    if (!this.savedData) {
      this.errorMessage = 'Registration data not found. Please go back and fill the form.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    const email = this.currentEmailValue;

    if (this.role === 'freelancer') {
      const request: RegisterFreelancerRequest = {
        ...this.savedData,
        email,
      };

      this.authService.registerFreelancer(request).subscribe({
        next: () => {
          this.clearSessionData();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = this.extractError(err);
        },
      });
    } else {
      const request: RegisterCompanyRequest = {
        ...this.savedData,
        email,
      };

      this.authService.registerCompany(request).subscribe({
        next: () => {
          this.clearSessionData();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = this.extractError(err);
        },
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }

  private clearSessionData(): void {
    sessionStorage.removeItem('register_role');
    sessionStorage.removeItem('register_data');
  }

  private extractError(err: any): string {
    if (err.error?.message) return err.error.message;
    if (err.error?.error) return err.error.error;
    if (typeof err.error === 'object' && err.error !== null) {
      return Object.values(err.error).join(', ');
    }
    return "L'inscription a échoué. Veuillez réessayer.";
  }
}
