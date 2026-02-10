import { Component, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MissionService } from '../../core/services/mission.service';
import { CreateMissionRequest } from '../../core/models/mission.model';

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
  selectedSectors: string[] = [];
  customSectorInput = '';
  sectorDropdownOpen = false;
  sectorSearch = '';

  // Edit mode
  isEditMode = false;
  missionId: string | null = null;

  sectorOptions = [
    'Development',
    'Front-end Development',
    'Back-end Development',
    'Full Stack Development',
    'Mobile Development',
    'DevOps',
    'Data Science',
    'Machine Learning / AI',
    'Cloud Computing',
    'Cybersecurity',
    'UI/UX Design',
    'Graphic Design',
    'Project Management',
    'QA / Testing',
    'Database Administration',
    'Network Engineering',
    'Blockchain',
    'Embedded Systems',
    'ERP / CRM',
    'Business Intelligence',
  ];

  constructor(
    private fb: FormBuilder,
    private missionService: MissionService,
    private router: Router,
    private route: ActivatedRoute,
    private elRef: ElementRef,
  ) {
    this.missionForm = this.fb.group({
      jobTitle: ['', [Validators.required]],
      field: ['', [Validators.required]],
      location: ['', [Validators.required]],
      missionType: ['', [Validators.required]],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      requiredSkills: ['', [Validators.required]],
      technicalEnvironment: [''],
      applicationDeadline: [''],
      missionBusinessSector: [''],
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
          tjm: mission.tjm ?? null,
        });
        // Restore selected sectors
        if (mission.missionBusinessSector) {
          this.selectedSectors = mission.missionBusinessSector.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        }
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
  }

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
          this.successMessage = 'Mission updated successfully!';
          setTimeout(() => this.router.navigate(['/missions']), 1500);
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
          this.successMessage = 'Mission posted successfully!';
          setTimeout(() => this.router.navigate(['/missions']), 1500);
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'An error occurred while posting the mission.';
        },
      });
    }
  }
}
