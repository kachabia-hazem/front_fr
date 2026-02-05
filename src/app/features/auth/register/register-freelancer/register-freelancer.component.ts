import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Gender } from '../../../../core/models';

@Component({
  selector: 'app-register-freelancer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-freelancer.component.html',
  styleUrl: './register-freelancer.component.css',
})
export class RegisterFreelancerComponent {
  registerForm: FormGroup;
  errorMessage = '';
  loading = false;
  currentStep = 1;
  showPassword = false;

  genders = Object.values(Gender);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.registerForm = this.fb.group({
      // Step 1: Personal
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      // Step 2: Professional (optional fields for later)
      currentPosition: [''],
      yearsOfExperience: [0],
      tjm: [0],
      portfolioUrl: [''],
      bio: [''],
      // Step 3: Security
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  get passwordStrength(): string {
    const password = this.registerForm.get('password')?.value || '';
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium';
    return 'strong';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.loading) return;

    this.loading = true;
    this.errorMessage = '';

    const formValue = this.registerForm.value;

    this.authService
      .registerFreelancer({
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        password: formValue.password,
        gender: formValue.gender,
        dateOfBirth: formValue.dateOfBirth,
        phoneNumber: formValue.phoneNumber,
        currentPosition: formValue.currentPosition || undefined,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
          this.loading = false;
        },
      });
  }
}
