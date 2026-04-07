import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  Gender,
  LegalForm,
} from '../../../core/models';
import { PhoneInputComponent } from '../../../shared/components/phone-input/phone-input.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PhoneInputComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  selectedRole: 'freelancer' | 'company' = 'freelancer';
  freelancerForm: FormGroup;
  companyForm: FormGroup;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

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
    private router: Router,
  ) {
    const savedRole = sessionStorage.getItem('register_role');
    if (savedRole === 'freelancer' || savedRole === 'company') {
      this.selectedRole = savedRole;
    }

    this.freelancerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      gender: ['', Validators.required],
      dateOfBirth: ['', [Validators.required, this.pastDateValidator, this.minAgeValidator(18)]],
      currentPosition: ['', [Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), this.strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });

    this.companyForm = this.fb.group({
      companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      foundationDate: ['', [Validators.required, this.pastDateValidator]],
      websiteUrl: ['', [this.optionalUrlValidator]],
      businessSector: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      legalForm: ['', Validators.required],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      tradeRegister: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9\-/]+$/)]],
      managerName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)]],
      managerEmail: ['', [Validators.required, Validators.email]],
      managerPosition: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      managerPhoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      description: ['', [Validators.maxLength(500)]],
      numberOfEmployees: [null, [Validators.min(1), Validators.max(1000000)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64), this.strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });

    this.restoreFormData();
  }

  // ── Custom Validators ──

  private passwordMatchValidator = (group: AbstractControl): ValidationErrors | null => {
    const passCtrl = group.get('password');
    const confirmCtrl = group.get('confirmPassword');
    if (!passCtrl || !confirmCtrl) return null;
    if (confirmCtrl.value && passCtrl.value !== confirmCtrl.value) {
      confirmCtrl.setErrors({ ...(confirmCtrl.errors ?? {}), passwordMismatch: true });
    } else if (confirmCtrl.errors?.['passwordMismatch']) {
      const errors = { ...confirmCtrl.errors };
      delete errors['passwordMismatch'];
      confirmCtrl.setErrors(Object.keys(errors).length ? errors : null);
    }
    return null;
  };

  private pastDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const date = new Date(control.value);
    if (date >= new Date()) return { pastDate: true };
    return null;
  }

  private minAgeValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const birth = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < minAge) return { minAge: { required: minAge, actual: age } };
      return null;
    };
  }

  private strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null;
    const errors: ValidationErrors = {};
    if (!/[A-Z]/.test(v)) errors['noUppercase'] = true;
    if (!/[a-z]/.test(v)) errors['noLowercase'] = true;
    if (!/[0-9]/.test(v)) errors['noDigit'] = true;
    return Object.keys(errors).length ? errors : null;
  }

  private optionalUrlValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v || v.trim() === '') return null;
    if (!/^https?:\/\/.+\..+/.test(v)) return { invalidUrl: true };
    return null;
  }

  // ── Field error messages ──

  getFieldError(form: FormGroup, fieldName: string): string {
    const control = form.get(fieldName);
    if (!control || !control.touched || !control.errors) return '';

    const errors = control.errors;
    const label = this.fieldLabels[fieldName] || fieldName;

    if (errors['required']) return `${label} is required.`;
    if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength']) return `${label} must not exceed ${errors['maxlength'].requiredLength} characters.`;
    if (errors['pattern']) {
      if (fieldName === 'firstName' || fieldName === 'lastName' || fieldName === 'managerName') {
        return `${label} must contain only letters.`;
      }
      if (fieldName === 'phoneNumber' || fieldName === 'managerPhoneNumber') {
        return `${label} must start with + or 0 followed by 8-15 digits.`;
      }
      if (fieldName === 'tradeRegister') {
        return `${label} must contain only letters, numbers and dashes.`;
      }
      return `${label} format is invalid.`;
    }
    if (errors['email']) return `Please enter a valid email address.`;
    if (errors['pastDate']) return `${label} must be in the past.`;
    if (errors['minAge']) return `You must be at least ${errors['minAge'].required} years old.`;
    if (errors['invalidUrl']) return `URL must start with http:// or https://`;
    if (errors['noUppercase']) return `Password must contain at least one uppercase letter.`;
    if (errors['noLowercase']) return `Password must contain at least one lowercase letter.`;
    if (errors['noDigit']) return `Password must contain at least one number.`;
    if (errors['passwordMismatch']) return `Passwords do not match.`;
    if (errors['min']) return `${label} must be at least ${errors['min'].min}.`;
    if (errors['max']) return `${label} must not exceed ${errors['max'].max}.`;

    return `${label} is invalid.`;
  }

  hasFieldError(form: FormGroup, fieldName: string): boolean {
    const control = form.get(fieldName);
    return !!(control && control.touched && control.invalid);
  }

  // ── Existing methods ──

  selectRole(role: 'freelancer' | 'company'): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onContinue(): void {
    const form = this.selectedRole === 'freelancer' ? this.freelancerForm : this.companyForm;

    if (form.invalid) {
      form.markAllAsTouched();
      this.errorMessage = this.getFormErrors(form);
      return;
    }

    this.errorMessage = '';
    sessionStorage.setItem('register_role', this.selectedRole);
    const { confirmPassword, ...dataToSave } = form.value;
    sessionStorage.setItem('register_data', JSON.stringify(dataToSave));
    this.router.navigate(['/auth/register/verify']);
  }

  private restoreFormData(): void {
    const savedData = sessionStorage.getItem('register_data');
    const savedRole = sessionStorage.getItem('register_role');
    if (!savedData || !savedRole) return;
    try {
      const data = JSON.parse(savedData);
      if (savedRole === 'freelancer') {
        this.freelancerForm.patchValue(data);
      } else if (savedRole === 'company') {
        this.companyForm.patchValue(data);
      }
    } catch {
      // Ignore parse errors
    }
  }

  private fieldLabels: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
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
    websiteUrl: 'Website URL',
    description: 'Description',
    numberOfEmployees: 'Number of Employees',
    currentPosition: 'Job Title',
    confirmPassword: 'Confirm Password',
    email: 'Email Address',
  };

  private getFormErrors(form: FormGroup): string {
    const invalidFields: string[] = [];
    for (const key of Object.keys(form.controls)) {
      if (form.controls[key].invalid) {
        invalidFields.push(this.fieldLabels[key] || key);
      }
    }
    if (invalidFields.length === 0) return 'Please fill in all required fields.';
    return `Invalid fields: ${invalidFields.join(', ')}`;
  }
}
