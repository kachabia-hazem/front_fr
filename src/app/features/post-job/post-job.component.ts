import { Component, HostListener, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MissionService } from '../../core/services/mission.service';
import { CreateMissionRequest } from '../../core/models/mission.model';
import { SECTOR_OPTIONS, SPECIALITY_OPTIONS } from '../../core/constants/mission-options';

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './post-job.component.html',
  styleUrl: './post-job.component.css',
})
export class PostJobComponent implements OnInit {
  missionForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  showToast = false;
  toastMessage = '';

  // Sector multi-select
  selectedSectors: string[] = [];
  customSectorInput = '';
  sectorDropdownOpen = false;
  sectorSearch = '';

  // Speciality multi-select
  selectedSpecialities: string[] = [];
  customSpecialityInput = '';
  specialityDropdownOpen = false;
  specialitySearch = '';

  // Edit mode
  isEditMode = false;
  missionId: string | null = null;

  sectorOptions = SECTOR_OPTIONS.map(s => s.label);
  specialityOptions = SPECIALITY_OPTIONS.map(s => s.label);

  // Rich editor refs
  @ViewChild('descriptionEditor') descriptionEditorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('requiredSkillsEditor') skillsEditorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('technicalEnvironmentEditor') techEnvEditorRef!: ElementRef<HTMLDivElement>;

  constructor(
    private fb: FormBuilder,
    private missionService: MissionService,
    private router: Router,
    private route: ActivatedRoute,
    private elRef: ElementRef,
    private cdr: ChangeDetectorRef,
  ) {
    this.missionForm = this.fb.group({
      jobTitle: ['', [Validators.required]],
      field: ['', [Validators.required]],
      location: ['', [Validators.required]],
      missionType: ['', [Validators.required]],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      description: ['', [Validators.required]],
      requiredSkills: ['', [Validators.required]],
      technicalEnvironment: [''],
      applicationDeadline: [''],
      missionBusinessSector: [''],
      speciality: [''],
      tjm: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.missionId = id;
      this.loadMission(id);
    }
  }

  private loadMission(id: string): void {
    this.loading = true;
    this.missionService.getMissionById(id).subscribe({
      next: (mission) => {
        this.missionForm.patchValue({
          jobTitle: mission.jobTitle || '',
          field: mission.field || '',
          location: mission.location || '',
          missionType: mission.missionType || '',
          yearsOfExperience: mission.yearsOfExperience ?? 0,
          startDate: this.toDateInput(mission.startDate),
          endDate: this.toDateInput(mission.endDate),
          description: mission.description || '',
          requiredSkills: mission.requiredSkills || '',
          technicalEnvironment: mission.technicalEnvironment || '',
          applicationDeadline: this.toDateInput(mission.applicationDeadline),
          missionBusinessSector: mission.missionBusinessSector || '',
          speciality: mission.speciality || '',
          tjm: mission.tjm ?? null,
        });
        // Restore selected sectors
        if (mission.missionBusinessSector) {
          this.selectedSectors = mission.missionBusinessSector.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }
        // Restore selected specialities
        if (mission.speciality) {
          this.selectedSpecialities = mission.speciality.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }
        // Populate rich editors with existing content
        setTimeout(() => {
          if (this.descriptionEditorRef) {
            this.descriptionEditorRef.nativeElement.innerHTML = mission.description || '';
          }
          if (this.skillsEditorRef) {
            this.skillsEditorRef.nativeElement.innerHTML = mission.requiredSkills || '';
          }
          if (this.techEnvEditorRef) {
            this.techEnvEditorRef.nativeElement.innerHTML = mission.technicalEnvironment || '';
          }
        });
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load mission.';
        this.loading = false;
      },
    });
  }

  private toDateInput(date: any): string {
    if (!date) return '';
    // Handle Java LocalDate array [2026, 3, 12]
    if (Array.isArray(date)) {
      const [y, m, d] = date;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    // Handle ISO string
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  get f() {
    return this.missionForm.controls;
  }

  hasError(field: string): boolean {
    const control = this.missionForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getError(field: string): string {
    const control = this.missionForm.get(field);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    return 'Invalid value';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const sectorEl = this.elRef.nativeElement.querySelector('.sector-field');
    if (sectorEl && !sectorEl.contains(event.target)) {
      this.sectorDropdownOpen = false;
    }
    const specEl = this.elRef.nativeElement.querySelector('.speciality-field');
    if (specEl && !specEl.contains(event.target)) {
      this.specialityDropdownOpen = false;
    }
  }

  // ── Rich Editor methods ──

  execFormat(event: Event, command: string): void {
    event.preventDefault();
    document.execCommand(command, false);
  }

  insertLink(event: Event): void {
    event.preventDefault();
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  }

  insertList(event: Event): void {
    event.preventDefault();
    document.execCommand('insertUnorderedList', false);
  }

  onEditorInput(field: string, editor: HTMLElement): void {
    const text = editor.innerText.replace(/\n/g, '').trim();
    const value = text ? editor.innerHTML : '';
    this.missionForm.patchValue({ [field]: value });
    this.missionForm.get(field)?.markAsDirty();
    this.missionForm.get(field)?.markAsTouched();
  }

  onEditorPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }

  // ── Sector methods ──

  get filteredSectorOptions(): string[] {
    const q = this.sectorSearch.toLowerCase();
    return this.sectorOptions.filter(
      s => !this.selectedSectors.includes(s) && s.toLowerCase().includes(q)
    );
  }

  toggleSectorDropdown(): void {
    this.sectorDropdownOpen = !this.sectorDropdownOpen;
    if (this.sectorDropdownOpen) {
      this.sectorSearch = '';
    }
  }

  selectSector(sector: string): void {
    if (!this.selectedSectors.includes(sector)) {
      this.selectedSectors.push(sector);
      this.syncSectorsToForm();
    }
    this.sectorSearch = '';
  }

  removeSector(sector: string): void {
    this.selectedSectors = this.selectedSectors.filter(s => s !== sector);
    this.syncSectorsToForm();
  }

  addCustomSector(): void {
    const val = this.customSectorInput.trim();
    if (val && !this.selectedSectors.includes(val)) {
      this.selectedSectors.push(val);
      this.syncSectorsToForm();
    }
    this.customSectorInput = '';
  }

  onCustomSectorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomSector();
    }
  }

  private syncSectorsToForm(): void {
    this.missionForm.patchValue({
      missionBusinessSector: this.selectedSectors.join(', ')
    });
  }

  // ── Speciality methods ──

  get filteredSpecialityOptions(): string[] {
    const q = this.specialitySearch.toLowerCase();
    return this.specialityOptions.filter(
      s => !this.selectedSpecialities.includes(s) && s.toLowerCase().includes(q)
    );
  }

  toggleSpecialityDropdown(): void {
    this.specialityDropdownOpen = !this.specialityDropdownOpen;
    if (this.specialityDropdownOpen) {
      this.specialitySearch = '';
    }
  }

  selectSpeciality(spec: string): void {
    if (!this.selectedSpecialities.includes(spec)) {
      this.selectedSpecialities.push(spec);
      this.syncSpecialitiesToForm();
    }
    this.specialitySearch = '';
  }

  removeSpeciality(spec: string): void {
    this.selectedSpecialities = this.selectedSpecialities.filter(s => s !== spec);
    this.syncSpecialitiesToForm();
  }

  addCustomSpeciality(): void {
    const val = this.customSpecialityInput.trim();
    if (val && !this.selectedSpecialities.includes(val)) {
      this.selectedSpecialities.push(val);
      this.syncSpecialitiesToForm();
    }
    this.customSpecialityInput = '';
  }

  onCustomSpecialityKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomSpeciality();
    }
  }

  private syncSpecialitiesToForm(): void {
    this.missionForm.patchValue({
      speciality: this.selectedSpecialities.join(', ')
    });
  }

  // ── Submit ──

  onSubmit(): void {
    this.missionForm.markAllAsTouched();

    if (this.missionForm.invalid) return;

    // Validate end date > start date
    const start = this.missionForm.value.startDate;
    const end = this.missionForm.value.endDate;
    if (start && end && new Date(end) <= new Date(start)) {
      this.errorMessage = 'End date must be after start date.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: CreateMissionRequest = this.missionForm.value;

    if (this.isEditMode && this.missionId) {
      this.missionService.updateMission(this.missionId, request).subscribe({
        next: () => {
          this.loading = false;
          this.showSuccessToast('Mission updated successfully!');
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'An error occurred while updating the mission.';
        },
      });
    } else {
      this.missionService.createMission(request).subscribe({
        next: () => {
          this.loading = false;
          this.showSuccessToast('Mission posted successfully!');
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'An error occurred while posting the mission.';
        },
      });
    }
  }

  private showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.router.navigate(['/missions']);
    }, 2500);
  }
}
