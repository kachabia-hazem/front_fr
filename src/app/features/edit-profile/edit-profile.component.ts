import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FreelancerService, UpdateFreelancerRequest } from '../../core/services/freelancer.service';
import { Freelancer, Gender, ProfileType, Language } from '../../core/models';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.css',
})
export class EditProfileComponent implements OnInit {
  profileForm!: FormGroup;
  freelancer = signal<Freelancer | null>(null);
  loading = signal(true);
  saving = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  genderOptions = Object.values(Gender);
  profileTypeOptions = Object.values(ProfileType);
  languageOptions = Object.values(Language);

  constructor(
    private fb: FormBuilder,
    private freelancerService: FreelancerService,
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [{ value: '', disabled: true }],
      gender: [''],
      dateOfBirth: [''],
      phoneNumber: [''],
      currentPosition: [''],
      yearsOfExperience: [null],
      profileTypes: [[]],
      tjm: [null],
      languages: [[]],
      bio: [''],
      skills: [''],
      portfolioUrl: [''],
    });

    this.loadProfile();
  }

  private loadProfile(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => {
        this.freelancer.set(profile);
        this.profileForm.patchValue({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          gender: profile.gender || '',
          dateOfBirth: profile.dateOfBirth || '',
          phoneNumber: profile.phoneNumber || '',
          currentPosition: profile.currentPosition || '',
          yearsOfExperience: profile.yearsOfExperience ?? null,
          profileTypes: profile.profileTypes || [],
          tjm: profile.tjm ?? null,
          languages: profile.languages || [],
          bio: profile.bio || '',
          skills: profile.skills?.join(', ') || '',
          portfolioUrl: profile.portfolioUrl || '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load profile data.');
        this.loading.set(false);
      },
    });
  }

  get initials(): string {
    const f = this.freelancer();
    if (!f) return '?';
    return (
      (f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')
    ).toUpperCase();
  }

  onProfileTypeChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const current: string[] = this.profileForm.get('profileTypes')!.value || [];
    if (checkbox.checked) {
      this.profileForm.get('profileTypes')!.setValue([...current, checkbox.value]);
    } else {
      this.profileForm.get('profileTypes')!.setValue(current.filter((t) => t !== checkbox.value));
    }
  }

  onLanguageChange(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const current: string[] = this.profileForm.get('languages')!.value || [];
    if (checkbox.checked) {
      this.profileForm.get('languages')!.setValue([...current, checkbox.value]);
    } else {
      this.profileForm.get('languages')!.setValue(current.filter((l) => l !== checkbox.value));
    }
  }

  isProfileTypeSelected(type: string): boolean {
    const current: string[] = this.profileForm.get('profileTypes')!.value || [];
    return current.includes(type);
  }

  isLanguageSelected(lang: string): boolean {
    const current: string[] = this.profileForm.get('languages')!.value || [];
    return current.includes(lang);
  }

  formatEnumLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  onSubmit(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const formValue = this.profileForm.getRawValue();

    const request: UpdateFreelancerRequest = {
      firstName: formValue.firstName || undefined,
      lastName: formValue.lastName || undefined,
      gender: formValue.gender || undefined,
      dateOfBirth: formValue.dateOfBirth || undefined,
      phoneNumber: formValue.phoneNumber || undefined,
      currentPosition: formValue.currentPosition || undefined,
      yearsOfExperience: formValue.yearsOfExperience ?? undefined,
      profileTypes: formValue.profileTypes?.length ? formValue.profileTypes : undefined,
      tjm: formValue.tjm ?? undefined,
      languages: formValue.languages?.length ? formValue.languages : undefined,
      bio: formValue.bio || undefined,
      skills: formValue.skills ? formValue.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s) : undefined,
      portfolioUrl: formValue.portfolioUrl || undefined,
    };

    this.freelancerService.updateMyProfile(request).subscribe({
      next: (updated) => {
        this.freelancer.set(updated);
        this.successMessage.set('Profile updated successfully!');
        this.saving.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to update profile. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
