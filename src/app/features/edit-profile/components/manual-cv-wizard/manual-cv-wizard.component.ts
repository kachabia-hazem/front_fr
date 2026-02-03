import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { StepperComponent, Step } from '../../../../shared/components/stepper/stepper.component';
import { StepBioComponent } from './steps/step-bio/step-bio.component';
import { StepEducationProjectsComponent } from './steps/step-education-projects/step-education-projects.component';
import { StepSkillsCertificationsComponent } from './steps/step-skills-certifications/step-skills-certifications.component';
import { StepWorkExperienceComponent } from './steps/step-work-experience/step-work-experience.component';
import { CvService } from '../../../../core/services/cv.service';
import { Freelancer, CvData } from '../../../../core/models';

@Component({
  selector: 'app-manual-cv-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepperComponent,
    StepBioComponent,
    StepEducationProjectsComponent,
    StepSkillsCertificationsComponent,
    StepWorkExperienceComponent,
  ],
  templateUrl: './manual-cv-wizard.component.html',
  styleUrl: './manual-cv-wizard.component.css',
})
export class ManualCvWizardComponent implements OnInit {
  @Input() freelancer: Freelancer | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Freelancer>();

  currentStep = signal(0);
  saving = signal(false);
  errorMessage = signal('');

  cvForm!: FormGroup;

  steps: Step[] = [
    { label: 'Presentez-vous' },
    { label: 'Education & Projets' },
    { label: 'Competences' },
    { label: 'Experience' },
  ];

  constructor(
    private fb: FormBuilder,
    private cvService: CvService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadExistingData();
  }

  private initForm(): void {
    this.cvForm = this.fb.group({
      bio: ['', [Validators.minLength(100), Validators.maxLength(2000)]],
      education: this.fb.array([]),
      projects: this.fb.array([]),
      skills: [[]],
      certifications: this.fb.array([]),
      workExperience: this.fb.array([]),
    });
  }

  private loadExistingData(): void {
    if (!this.freelancer) return;

    // Load bio
    if (this.freelancer.bio) {
      this.cvForm.patchValue({ bio: this.freelancer.bio });
    }

    // Load skills
    if (this.freelancer.skills) {
      this.cvForm.patchValue({ skills: this.freelancer.skills });
    }

    // Load education
    if (this.freelancer.education) {
      this.freelancer.education.forEach(edu => {
        this.educationArray.push(this.createEducationGroup(edu));
      });
    }

    // Load projects
    if (this.freelancer.projects) {
      this.freelancer.projects.forEach(proj => {
        this.projectsArray.push(this.createProjectGroup(proj));
      });
    }

    // Load certifications
    if (this.freelancer.certifications) {
      this.freelancer.certifications.forEach(cert => {
        this.certificationsArray.push(this.createCertificationGroup(cert));
      });
    }

    // Load work experience
    if (this.freelancer.workExperience) {
      this.freelancer.workExperience.forEach(exp => {
        this.workExperienceArray.push(this.createWorkExperienceGroup(exp));
      });
    }
  }

  get educationArray(): FormArray {
    return this.cvForm.get('education') as FormArray;
  }

  get projectsArray(): FormArray {
    return this.cvForm.get('projects') as FormArray;
  }

  get certificationsArray(): FormArray {
    return this.cvForm.get('certifications') as FormArray;
  }

  get workExperienceArray(): FormArray {
    return this.cvForm.get('workExperience') as FormArray;
  }

  createEducationGroup(data?: any): FormGroup {
    return this.fb.group({
      id: [data?.id || this.generateId()],
      diploma: [data?.diploma || '', Validators.required],
      institution: [data?.institution || '', Validators.required],
      year: [data?.year || null, Validators.required],
      description: [data?.description || ''],
    });
  }

  createProjectGroup(data?: any): FormGroup {
    return this.fb.group({
      id: [data?.id || this.generateId()],
      name: [data?.name || '', Validators.required],
      description: [data?.description || ''],
      technologies: [data?.technologies || []],
      url: [data?.url || ''],
    });
  }

  createCertificationGroup(data?: any): FormGroup {
    return this.fb.group({
      id: [data?.id || this.generateId()],
      name: [data?.name || '', Validators.required],
      issuer: [data?.issuer || '', Validators.required],
      issueDate: [data?.issueDate || ''],
      expiryDate: [data?.expiryDate || ''],
      certificateUrl: [data?.certificateUrl || ''],
    });
  }

  createWorkExperienceGroup(data?: any): FormGroup {
    return this.fb.group({
      id: [data?.id || this.generateId()],
      jobTitle: [data?.jobTitle || '', Validators.required],
      company: [data?.company || '', Validators.required],
      startDate: [data?.startDate || '', Validators.required],
      endDate: [data?.endDate || ''],
      isCurrent: [data?.isCurrent || false],
      description: [data?.description || ''],
    });
  }

  private generateId(): string {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  onStepChange(step: number): void {
    this.currentStep.set(step);
  }

  nextStep(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  close(): void {
    this.closed.emit();
  }

  onSave(): void {
    if (this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');

    const formValue = this.cvForm.value;

    const cvData: CvData = {
      bio: formValue.bio || undefined,
      education: formValue.education,
      projects: formValue.projects,
      skills: formValue.skills,
      certifications: formValue.certifications,
      workExperience: formValue.workExperience,
    };

    this.cvService.updateCvData(cvData).subscribe({
      next: (updatedFreelancer) => {
        this.saving.set(false);
        this.saved.emit(updatedFreelancer);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set('Failed to save CV data. Please try again.');
        console.error('CV save error:', err);
      },
    });
  }

  get isFirstStep(): boolean {
    return this.currentStep() === 0;
  }

  get isLastStep(): boolean {
    return this.currentStep() === this.steps.length - 1;
  }
}
