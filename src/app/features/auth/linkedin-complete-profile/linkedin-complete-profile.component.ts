import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LinkedInProfile, OAuthLinkedInCompleteRequest } from '../../../core/models/auth.model';
import { Gender, ProfileType, Language, LegalForm } from '../../../core/models/enums.model';

@Component({
  selector: 'app-linkedin-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './linkedin-complete-profile.component.html',
  styles: [`
    .complete-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #dce8ec;
      padding: 2rem;
    }
    .complete-card {
      background: #fff;
      border-radius: 1.25rem;
      padding: 2.5rem;
      width: 100%;
      max-width: 600px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    }
    h2 {
      text-align: center;
      font-size: 1.5rem;
      color: #1a1a2e;
      margin: 0 0 0.5rem;
    }
    .subtitle {
      text-align: center;
      color: #6b7280;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      color: #6b7280;
      margin-bottom: 0.35rem;
    }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 0.7rem 0.9rem;
      border: 1px solid #e0e0e0;
      border-radius: 0.5rem;
      font-size: 0.9rem;
      color: #1a1a2e;
      background: #fafafa;
      outline: none;
      box-sizing: border-box;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: #4e9e92;
      background: #fff;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .form-row .form-group {
      flex: 1;
    }
    .error-message {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      padding: 0.6rem 0.8rem;
      font-size: 0.82rem;
      margin-bottom: 1rem;
    }
    .btn-submit {
      width: 100%;
      padding: 0.75rem;
      background: #4e9e92;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-submit:hover:not(:disabled) { background: #3d8b80; }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-back {
      display: block;
      text-align: center;
      margin-top: 1rem;
      color: #4e9e92;
      font-size: 0.85rem;
      cursor: pointer;
      background: none;
      border: none;
      width: 100%;
    }
    .btn-back:hover { text-decoration: underline; }
  `],
})
export class LinkedInCompleteProfileComponent implements OnInit {
  profile: LinkedInProfile | null = null;
  selectedRole: string = '';
  form!: FormGroup;
  errorMessage = '';
  loading = false;

  genders = Object.values(Gender);
  profileTypes = Object.values(ProfileType);
  languages = Object.values(Language);
  legalForms = Object.values(LegalForm);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const profileData = sessionStorage.getItem('linkedin_profile');
    const role = sessionStorage.getItem('linkedin_selected_role');

    if (!profileData || !role) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.profile = JSON.parse(profileData);
    this.selectedRole = role;

    if (this.selectedRole === 'FREELANCER') {
      this.buildFreelancerForm();
    } else {
      this.buildCompanyForm();
    }
  }

  private buildFreelancerForm(): void {
    this.form = this.fb.group({
      firstName: [this.profile?.given_name || '', Validators.required],
      lastName: [this.profile?.family_name || '', Validators.required],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      profileTypes: [[], Validators.required],
      tjm: [0, [Validators.required, Validators.min(0)]],
      languages: [[], Validators.required],
      currentPosition: [''],
      bio: [''],
      skills: [''],
      portfolioUrl: [''],
    });
  }

  private buildCompanyForm(): void {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      address: ['', Validators.required],
      websiteUrl: [''],
      legalForm: ['', Validators.required],
      tradeRegister: ['', Validators.required],
      foundationDate: ['', Validators.required],
      businessSector: ['', Validators.required],
      managerName: [this.profile ? `${this.profile.given_name} ${this.profile.family_name}` : '', Validators.required],
      managerEmail: [this.profile?.email || '', [Validators.required, Validators.email]],
      managerPosition: ['', Validators.required],
      managerPhoneNumber: ['', Validators.required],
      description: [''],
      numberOfEmployees: [null],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const formValue = this.form.value;

    const request: OAuthLinkedInCompleteRequest = {
      role: this.selectedRole,
      email: this.profile!.email,
      linkedInId: this.profile!.sub,
    };

    if (this.selectedRole === 'FREELANCER') {
      request.firstName = formValue.firstName;
      request.lastName = formValue.lastName;
      request.gender = formValue.gender;
      request.dateOfBirth = formValue.dateOfBirth;
      request.phoneNumber = formValue.phoneNumber;
      request.yearsOfExperience = formValue.yearsOfExperience;
      request.profileTypes = formValue.profileTypes;
      request.tjm = formValue.tjm;
      request.languages = formValue.languages;
      request.currentPosition = formValue.currentPosition;
      request.bio = formValue.bio;
      request.skills = formValue.skills ? formValue.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
      request.portfolioUrl = formValue.portfolioUrl;
      request.profilePicture = this.profile?.picture;
    } else {
      request.companyName = formValue.companyName;
      request.address = formValue.address;
      request.websiteUrl = formValue.websiteUrl;
      request.legalForm = formValue.legalForm;
      request.tradeRegister = formValue.tradeRegister;
      request.foundationDate = formValue.foundationDate;
      request.businessSector = formValue.businessSector;
      request.managerName = formValue.managerName;
      request.managerEmail = formValue.managerEmail;
      request.managerPosition = formValue.managerPosition;
      request.managerPhoneNumber = formValue.managerPhoneNumber;
      request.description = formValue.description;
      request.numberOfEmployees = formValue.numberOfEmployees;
    }

    this.authService.linkedInCompleteRegistration(request).subscribe({
      next: () => {
        // Clean up sessionStorage
        sessionStorage.removeItem('linkedin_profile');
        sessionStorage.removeItem('linkedin_selected_role');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || "Erreur lors de l'inscription.";
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/linkedin/role-selection']);
  }
}
