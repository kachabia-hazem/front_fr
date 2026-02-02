import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  Gender,
  LegalForm,
  RegisterFreelancerRequest,
  RegisterCompanyRequest,
} from '../../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  selectedRole: 'freelancer' | 'company' = 'freelancer';
  freelancerForm: FormGroup;
  companyForm: FormGroup;
  errorMessage = '';
  loading = false;
  showPassword = false;

  // Email verification state
  emailVerified = false;
  verificationSent = false;
  verificationCode = '';
  verificationLoading = false;
  verificationError = '';
  cooldownSeconds = 0;
  private cooldownInterval: any = null;

  genders = Object.values(Gender);
  legalForms = Object.values(LegalForm);

  legalFormLabels: Record<string, string> = {
    SARL: 'SARL \u2013 Limited Liability Company',
    SAS: 'SAS \u2013 Simplified Joint-Stock Company',
    PAS: 'PAS \u2013 Public Limited Company',
    SUARL: 'SUARL \u2013 Single-Member Limited Liability',
    OTHER: 'Other',
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.freelancerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      currentPosition: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });

    this.companyForm = this.fb.group({
      companyName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      foundationDate: ['', Validators.required],
      websiteUrl: [''],
      businessSector: ['', Validators.required],
      legalForm: ['', Validators.required],
      address: ['', Validators.required],
      tradeRegister: ['', Validators.required],
      managerName: ['', Validators.required],
      managerEmail: ['', [Validators.required, Validators.email]],
      managerPosition: ['', Validators.required],
      managerPhoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      description: [''],
      numberOfEmployees: [null],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  selectRole(role: 'freelancer' | 'company'): void {
    this.selectedRole = role;
    this.errorMessage = '';
    this.resetVerificationState();
  }

  private resetVerificationState(): void {
    this.emailVerified = false;
    this.verificationSent = false;
    this.verificationCode = '';
    this.verificationLoading = false;
    this.verificationError = '';
    this.cooldownSeconds = 0;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  get currentEmailValue(): string {
    const form = this.selectedRole === 'freelancer' ? this.freelancerForm : this.companyForm;
    return form.get('email')?.value || '';
  }

  sendVerificationCode(): void {
    const email = this.currentEmailValue;
    const emailControl = this.selectedRole === 'freelancer'
      ? this.freelancerForm.get('email')
      : this.companyForm.get('email');

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

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (!this.emailVerified) {
      this.errorMessage = 'Please verify your email address before registering.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    if (this.selectedRole === 'freelancer') {
      this.submitFreelancer();
    } else {
      this.submitCompany();
    }
  }

  private submitFreelancer(): void {
    if (this.freelancerForm.invalid) {
      this.freelancerForm.markAllAsTouched();
      this.loading = false;
      this.errorMessage = this.getFormErrors(this.freelancerForm);
      return;
    }
    const form = this.freelancerForm.value;
    const request: RegisterFreelancerRequest = {
      ...form,
    };

    this.authService.registerFreelancer(request).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractError(err);
      },
    });
  }

  private submitCompany(): void {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      this.loading = false;
      this.errorMessage = this.getFormErrors(this.companyForm);
      return;
    }

    const request: RegisterCompanyRequest = { ...this.companyForm.value };

    this.authService.registerCompany(request).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading = false;
        this.errorMessage = this.extractError(err);
      },
    });
  }

  private fieldLabels: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phoneNumber: 'Phone Number',
    gender: 'Gender',
    dateOfBirth: 'Date of Birth',
    password: 'Password',
    companyName: 'Company Name',
    foundationDate: 'Foundation Date',
    businessSector: 'Business Sector',
    legalForm: 'Legal Form',
    address: 'Address',
    tradeRegister: 'Trade Register',
    managerName: 'Manager Name',
    managerEmail: 'Manager Email',
    managerPosition: 'Manager Position',
    managerPhoneNumber: 'Manager Phone',
  };

  private getFormErrors(form: FormGroup): string {
    const invalidFields: string[] = [];
    for (const key of Object.keys(form.controls)) {
      if (form.controls[key].invalid) {
        invalidFields.push(this.fieldLabels[key] || key);
      }
    }
    if (invalidFields.length === 0) return 'Veuillez remplir tous les champs obligatoires.';
    return `Champs invalides : ${invalidFields.join(', ')}`;
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
