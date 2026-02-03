import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FreelancerService, UpdateFreelancerRequest } from '../../core/services/freelancer.service';
import { CvService } from '../../core/services/cv.service';
import { Freelancer, Gender, ProfileType, Language } from '../../core/models';
import { ManualCvWizardComponent } from './components/manual-cv-wizard/manual-cv-wizard.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ManualCvWizardComponent, FileUploadComponent],
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
  showCvWizard = signal(false);
  uploadingPhoto = signal(false);
  uploadingCv = signal(false);

  genderOptions = Object.values(Gender);
  profileTypeOptions = Object.values(ProfileType);
  languageOptions = Object.values(Language);

  constructor(
    private fb: FormBuilder,
    private freelancerService: FreelancerService,
    private cvService: CvService,
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

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    // L'URL de base est http://localhost:8080/api, on enlève /api pour avoir http://localhost:8080
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
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

  openCvWizard(): void {
    this.showCvWizard.set(true);
  }

  closeCvWizard(): void {
    this.showCvWizard.set(false);
  }

  onCvSaved(freelancer: Freelancer): void {
    this.freelancer.set(freelancer);
    this.showCvWizard.set(false);
    this.successMessage.set('CV updated successfully!');
  }

  onProfilePictureSelected(file: File): void {
    this.uploadingPhoto.set(true);
    this.errorMessage.set('');

    this.cvService.uploadProfilePicture(file).subscribe({
      next: (response) => {
        this.cvService.updateProfilePictureUrl(response.url).subscribe({
          next: (freelancer) => {
            this.freelancer.set(freelancer);
            this.successMessage.set('Photo de profil mise à jour!');
            this.uploadingPhoto.set(false);
          },
          error: () => {
            this.errorMessage.set('Erreur lors de la mise à jour de la photo.');
            this.uploadingPhoto.set(false);
          },
        });
      },
      error: () => {
        this.errorMessage.set('Erreur lors du téléchargement de la photo.');
        this.uploadingPhoto.set(false);
      },
    });
  }

  onCvFileSelected(file: File): void {
    this.uploadingCv.set(true);
    this.errorMessage.set('');

    this.cvService.uploadCv(file).subscribe({
      next: (response) => {
        this.cvService.updateCvUrl(response.url).subscribe({
          next: (freelancer) => {
            this.freelancer.set(freelancer);
            this.successMessage.set('CV mis à jour!');
            this.uploadingCv.set(false);
          },
          error: () => {
            this.errorMessage.set('Erreur lors de la mise à jour du CV.');
            this.uploadingCv.set(false);
          },
        });
      },
      error: () => {
        this.errorMessage.set('Erreur lors du téléchargement du CV.');
        this.uploadingCv.set(false);
      },
    });
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
