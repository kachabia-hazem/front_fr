import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LegalForm } from '../../../../core/models';

@Component({
  selector: 'app-register-company',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-company.component.html',
  styleUrl: './register-company.component.css',
})
export class RegisterCompanyComponent {
  registerForm: FormGroup;
  errorMessage = '';
  loading = false;
  currentStep = 1;
  showPassword = false;

  legalForms = Object.values(LegalForm);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.registerForm = this.fb.group({
      // Step 1: Company Info
      companyName: ['', Validators.required],
      businessSector: ['', Validators.required],
      legalForm: ['', Validators.required],
      tradeRegister: ['', Validators.required],
      foundationDate: ['', Validators.required],
      address: ['', Validators.required],
      // Step 2: Manager Info
      managerName: ['', Validators.required],
      managerPosition: ['', Validators.required],
      managerEmail: ['', [Validators.required, Validators.email]],
      managerPhoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      websiteUrl: [''],
      numberOfEmployees: [null],
      description: [''],
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
      .registerCompany({
        companyName: formValue.companyName,
        email: formValue.email,
        password: formValue.password,
        address: formValue.address,
        websiteUrl: formValue.websiteUrl || undefined,
        legalForm: formValue.legalForm,
        tradeRegister: formValue.tradeRegister,
        foundationDate: formValue.foundationDate,
        businessSector: formValue.businessSector,
        managerName: formValue.managerName,
        managerEmail: formValue.managerEmail,
        managerPosition: formValue.managerPosition,
        managerPhoneNumber: formValue.managerPhoneNumber,
        description: formValue.description || undefined,
        numberOfEmployees: formValue.numberOfEmployees || undefined,
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
