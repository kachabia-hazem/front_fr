import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Gender, ProfileType, Language } from '../../../../core/models';

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

  genders = Object.values(Gender);
  profileTypes = Object.values(ProfileType);
  languages = Object.values(Language);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+0]\d{8,15}$/)]],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      profileTypes: [[], Validators.required],
      tjm: [0, [Validators.required, Validators.min(0.01)]],
      languages: [[], Validators.required],
      currentPosition: [''],
      bio: [''],
      skills: [''],
      portfolioUrl: [''],
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    // TODO: implement register freelancer logic
  }
}
