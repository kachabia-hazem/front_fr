import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
  step: 'email' | 'code' | 'reset' = 'email';
  email = '';
  code = '';
  errorMessage = '';
  successMessage = '';
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  emailForm: FormGroup;
  codeForm: FormGroup;
  resetForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.codeForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });

    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  sendCode(): void {
    if (this.emailForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.email = this.emailForm.value.email;

    this.authService.sendVerificationCode(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.step = 'code';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to send verification code.';
      },
    });
  }

  verifyCode(): void {
    if (this.codeForm.invalid) return;

    this.code = this.codeForm.value.code;
    this.loading = true;
    this.errorMessage = '';

    this.authService.verifyCode(this.email, this.code).subscribe({
      next: () => {
        this.loading = false;
        this.step = 'reset';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Code de vérification invalide ou expiré.';
      },
    });
  }

  resetPassword(): void {
    if (this.resetForm.invalid) return;

    const { newPassword, confirmPassword } = this.resetForm.value;

    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.resetPassword(this.email, this.code, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/login'], { queryParams: { reset: 'true' } });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to reset password.';
      },
    });
  }

  resendCode(): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.sendVerificationCode(this.email).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'A new code has been sent to your email.';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to resend code.';
      },
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
