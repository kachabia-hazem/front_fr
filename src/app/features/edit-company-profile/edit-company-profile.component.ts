import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompanyService, UpdateCompanyRequest } from '../../core/services/company.service';
import { Company, LegalForm } from '../../core/models';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-edit-company-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent, TranslateModule],
  templateUrl: './edit-company-profile.component.html',
  styleUrl: './edit-company-profile.component.css',
})
export class EditCompanyProfileComponent implements OnInit {
  profileForm!: FormGroup;
  company = signal<Company | null>(null);
  loading = signal(true);
  saving = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  uploadingLogo = signal(false);

  legalFormOptions = Object.values(LegalForm);

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private router: Router,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      companyName: [''],
      email: [{ value: '', disabled: true }],
      address: [''],
      websiteUrl: [''],
      legalForm: [''],
      tradeRegister: [''],
      foundationDate: [''],
      businessSector: [''],
      description: [''],
      numberOfEmployees: [null],
      managerName: [''],
      managerEmail: [''],
      managerPosition: [''],
      managerPhoneNumber: [''],
    });

    this.loadProfile();
  }

  private loadProfile(): void {
    this.companyService.getMyProfile().subscribe({
      next: (profile) => {
        this.company.set(profile);
        this.profileForm.patchValue({
          companyName: profile.companyName || '',
          email: profile.email || '',
          address: profile.address || '',
          websiteUrl: profile.websiteUrl || '',
          legalForm: profile.legalForm || '',
          tradeRegister: profile.tradeRegister || '',
          foundationDate: profile.foundationDate || '',
          businessSector: profile.businessSector || '',
          description: profile.description || '',
          numberOfEmployees: profile.numberOfEmployees ?? null,
          managerName: profile.managerName || '',
          managerEmail: profile.managerEmail || '',
          managerPosition: profile.managerPosition || '',
          managerPhoneNumber: profile.managerPhoneNumber || '',
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
    const c = this.company();
    if (!c || !c.companyName) return '?';
    return c.companyName.charAt(0).toUpperCase();
  }

  // Profile completion percentage
  get profileCompletion(): number {
    const c = this.company();
    if (!c) return 0;

    const fields = [
      { value: c.companyName, weight: 15 },
      { value: c.address, weight: 10 },
      { value: c.legalForm, weight: 10 },
      { value: c.tradeRegister, weight: 10 },
      { value: c.foundationDate, weight: 5 },
      { value: c.businessSector, weight: 10 },
      { value: c.managerName, weight: 10 },
      { value: c.managerEmail, weight: 5 },
      { value: c.managerPosition, weight: 5 },
      { value: c.managerPhoneNumber, weight: 5 },
      { value: c.companyLogo, weight: 10 },
      { value: c.description, weight: 5 },
    ];

    let completed = 0;
    let total = 0;

    for (const field of fields) {
      total += field.weight;
      if (field.value) {
        completed += field.weight;
      }
    }

    return Math.round((completed / total) * 100);
  }

  get isProfileComplete(): boolean {
    return this.profileCompletion >= 100;
  }

  // SVG circle properties for progress ring
  get progressCircumference(): number {
    return 2 * Math.PI * 45;
  }

  get progressOffset(): number {
    const progress = this.profileCompletion / 100;
    return this.progressCircumference * (1 - progress);
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  formatEnumLabel(value: string): string {
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  onLogoSelected(file: File): void {
    this.uploadingLogo.set(true);
    this.errorMessage.set('');

    this.companyService.uploadCompanyLogo(file).subscribe({
      next: (response) => {
        this.companyService.updateCompanyLogoUrl(response.url).subscribe({
          next: (company) => {
            this.company.set(company);
            this.successMessage.set('Logo updated successfully!');
            this.uploadingLogo.set(false);
          },
          error: () => {
            this.errorMessage.set('Error updating the logo.');
            this.uploadingLogo.set(false);
          },
        });
      },
      error: () => {
        this.errorMessage.set('Error uploading the logo.');
        this.uploadingLogo.set(false);
      },
    });
  }

  onSubmit(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const formValue = this.profileForm.getRawValue();

    const request: UpdateCompanyRequest = {
      companyName: formValue.companyName || undefined,
      address: formValue.address || undefined,
      websiteUrl: formValue.websiteUrl || undefined,
      legalForm: formValue.legalForm || undefined,
      tradeRegister: formValue.tradeRegister || undefined,
      foundationDate: formValue.foundationDate || undefined,
      businessSector: formValue.businessSector || undefined,
      description: formValue.description || undefined,
      numberOfEmployees: formValue.numberOfEmployees ?? undefined,
      managerName: formValue.managerName || undefined,
      managerEmail: formValue.managerEmail || undefined,
      managerPosition: formValue.managerPosition || undefined,
      managerPhoneNumber: formValue.managerPhoneNumber || undefined,
    };

    this.companyService.updateMyProfile(request).subscribe({
      next: (updated) => {
        this.company.set(updated);
        this.successMessage.set('Profile updated successfully!');
        this.saving.set(false);
        setTimeout(() => this.router.navigate(['/company-profile']), 1500);
      },
      error: () => {
        this.errorMessage.set('Failed to update profile. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
