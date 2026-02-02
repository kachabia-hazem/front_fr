import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

  legalForms = Object.values(LegalForm);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.registerForm = this.fb.group({
      companyName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      address: ['', Validators.required],
      websiteUrl: [''],
      legalForm: ['', Validators.required],
      tradeRegister: ['', Validators.required],
      foundationDate: ['', Validators.required],
      businessSector: ['', Validators.required],
      managerName: ['', Validators.required],
      managerEmail: ['', [Validators.required, Validators.email]],
      managerPosition: ['', Validators.required],
      managerPhoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      description: [''],
      numberOfEmployees: [null],
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    // TODO: implement register company logic
  }
}
