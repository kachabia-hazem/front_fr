import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MissionService } from '../../core/services/mission.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { CvService } from '../../core/services/cv.service';
import { ApplicationService } from '../../core/services/application.service';
import { Mission } from '../../core/models/mission.model';
import { Freelancer, CreateApplicationRequest } from '../../core/models';
import { PhoneInputComponent } from '../../shared/components/phone-input/phone-input.component';
import { environment } from '../../../environments/environment';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdf.worker.min.mjs';

@Component({
  selector: 'app-apply-mission',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent, TranslateModule],
  templateUrl: './apply-mission.component.html',
  styleUrl: './apply-mission.component.css',
})
export class ApplyMissionComponent implements OnInit, OnDestroy {
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;

  mission = signal<Mission | null>(null);
  freelancer = signal<Freelancer | null>(null);
  loading = signal(true);
  error = signal('');
  submitting = signal(false);
  submitError = signal('');
  showWithdrawToast = signal(false);
  showFullDescription = signal(false);

  currentStep = 1;
  totalSteps = 6;

  contactForm!: FormGroup;
  locationForm!: FormGroup;
  questionsForm!: FormGroup;

  editingCountry = false;

  // Step 3 — CV
  cvError = false;
  cvOption: 'upload' | 'profile' | null = null;
  uploadedCvFile: File | null = null;
  uploadedCvName = '';
  profileCvName = '';

  // PDF Preview
  pdfDoc: any = null;
  pdfCurrentPage = 1;
  pdfTotalPages = 0;
  pdfLoading = false;
  private uploadedObjectUrl: string | null = null;

  // Step 5 — Preparation
  preparationProgress = 0;
  private preparationTimer: any = null;

  // Edit from review
  editingFromReview = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private missionService: MissionService,
    private freelancerService: FreelancerService,
    private cvService: CvService,
    private applicationService: ApplicationService,
  ) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+\d{8,15}$/)]],
    });

    this.locationForm = this.fb.group({
      country: ['', Validators.required],
      postalCode: [''],
      city: ['', Validators.required],
    });

    this.questionsForm = this.fb.group({
      salaryExpectations: ['', Validators.required],
      currentSalaryAndNotice: ['', Validators.required],
      previouslyWorked: ['', Validators.required],
      previousWorkDate: [''],
      previousWorkExperience: [''],
    });

    // Toggle validators when "previouslyWorked" changes
    this.questionsForm.get('previouslyWorked')?.valueChanges.subscribe((value) => {
      const dateCtrl = this.questionsForm.get('previousWorkDate')!;
      const expCtrl = this.questionsForm.get('previousWorkExperience')!;
      if (value === 'yes') {
        dateCtrl.setValidators(Validators.required);
        expCtrl.setValidators(Validators.required);
      } else {
        dateCtrl.clearValidators();
        expCtrl.clearValidators();
        dateCtrl.setValue('');
        expCtrl.setValue('');
      }
      dateCtrl.updateValueAndValidity();
      expCtrl.updateValueAndValidity();
    });

    const missionId = this.route.snapshot.paramMap.get('id');
    if (!missionId) {
      this.error.set('Mission not found');
      this.loading.set(false);
      return;
    }

    forkJoin({
      mission: this.missionService.getMissionById(missionId),
      freelancer: this.freelancerService.getMyProfile(),
    }).subscribe({
      next: ({ mission, freelancer }) => {
        this.mission.set(mission);
        this.freelancer.set(freelancer);
        this.prefillForm(freelancer);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load data. Please try again.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.uploadedObjectUrl) {
      URL.revokeObjectURL(this.uploadedObjectUrl);
    }
    if (this.preparationTimer) {
      clearInterval(this.preparationTimer);
    }
  }

  private prefillForm(freelancer: Freelancer): void {
    this.contactForm.patchValue({
      firstName: freelancer.firstName || '',
      lastName: freelancer.lastName || '',
      email: freelancer.email || '',
      phoneNumber: freelancer.phoneNumber || '',
    });

    this.locationForm.patchValue({
      country: freelancer.country || 'Tunisia',
      postalCode: freelancer.postalCode || '',
      city: freelancer.city || '',
    });

    if (freelancer.cvUrl) {
      this.profileCvName = freelancer.cvUrl.split('/').pop() || 'My CV';
    }
  }

  get progressPercent(): number {
    if (this.currentStep >= 5) return 100;
    // Steps 1-4 fill 25% each
    return Math.round((this.currentStep / 4) * 100);
  }

  get currentForm(): FormGroup {
    if (this.currentStep === 1) return this.contactForm;
    if (this.currentStep === 2) return this.locationForm;
    if (this.currentStep === 4) return this.questionsForm;
    return this.contactForm;
  }

  get hasProfileCv(): boolean {
    return !!this.freelancer()?.cvUrl;
  }

  get showPdfPreview(): boolean {
    return !!this.pdfDoc;
  }

  toggleDescription(): void {
    this.showFullDescription.update((v) => !v);
  }

  toggleEditCountry(): void {
    this.editingCountry = !this.editingCountry;
  }

  // ── Step 3: CV methods ──

  selectCvOption(option: 'upload' | 'profile'): void {
    if (this.cvOption === option) return;
    this.cvOption = option;
    this.cvError = false;
    this.closePdfPreview();

    if (option === 'profile') {
      this.uploadedCvFile = null;
      this.uploadedCvName = '';
      this.loadProfileCvPdf();
    }
  }

  onCvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return;

    const allowed = ['.pdf', '.docx', '.rtf', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) return;

    this.uploadedCvFile = file;
    this.uploadedCvName = file.name;
    this.cvOption = 'upload';
    this.cvError = false;
    this.closePdfPreview();

    if (ext === '.pdf') {
      this.loadUploadedCvPdf(file);
    }
  }

  clearCvSelection(): void {
    this.cvOption = null;
    this.uploadedCvFile = null;
    this.uploadedCvName = '';
    this.closePdfPreview();
  }

  private closePdfPreview(): void {
    this.pdfDoc = null;
    this.pdfCurrentPage = 1;
    this.pdfTotalPages = 0;
    if (this.uploadedObjectUrl) {
      URL.revokeObjectURL(this.uploadedObjectUrl);
      this.uploadedObjectUrl = null;
    }
  }

  private async loadProfileCvPdf(): Promise<void> {
    const cvUrl = this.freelancer()?.cvUrl;
    if (!cvUrl) return;

    const fullUrl = environment.apiUrl.replace(/\/api$/, '') + cvUrl;
    await this.loadPdf(fullUrl);
  }

  private async loadUploadedCvPdf(file: File): Promise<void> {
    if (this.uploadedObjectUrl) {
      URL.revokeObjectURL(this.uploadedObjectUrl);
    }
    this.uploadedObjectUrl = URL.createObjectURL(file);
    await this.loadPdf(this.uploadedObjectUrl);
  }

  private async loadPdf(url: string): Promise<void> {
    this.pdfLoading = true;
    this.cdr.detectChanges();
    try {
      const doc = await pdfjsLib.getDocument(url).promise;
      this.pdfDoc = doc;
      this.pdfTotalPages = doc.numPages;
      this.pdfCurrentPage = 1;
      this.pdfLoading = false;
      // Trigger DOM update so the canvas element is rendered before we paint on it
      this.cdr.detectChanges();
      // Small delay to let the browser lay out the canvas at its real width
      setTimeout(() => this.renderPage(1), 50);
    } catch {
      this.pdfLoading = false;
      this.pdfDoc = null;
      this.cdr.detectChanges();
    }
  }

  async renderPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc || !this.pdfCanvas) return;

    const page = await this.pdfDoc.getPage(pageNum);
    const canvas = this.pdfCanvas.nativeElement;
    const ctx = canvas.getContext('2d')!;

    // Scale to fit container width — fall back to 480 only if layout hasn't happened yet
    const containerWidth = (canvas.parentElement?.clientWidth || 0) > 0
      ? canvas.parentElement!.clientWidth
      : 480;
    const viewport = page.getViewport({ scale: 1 });
    const scale = (containerWidth - 2) / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    this.cdr.detectChanges();
  }

  goToPdfPage(page: number): void {
    if (page < 1 || page > this.pdfTotalPages) return;
    this.pdfCurrentPage = page;
    this.renderPage(page);
  }

  onPageInputChange(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    if (value >= 1 && value <= this.pdfTotalPages) {
      this.goToPdfPage(value);
    }
  }

  // ── Navigation ──

  onContinue(): void {
    // If editing from review, save and go back to review
    if (this.editingFromReview) {
      if (this.currentStep === 3) {
        if (!this.cvOption) {
          this.cvError = true;
          return;
        }
        this.cvError = false;
        this.editingFromReview = false;
        this.closePdfPreview();
        this.currentStep = 6;
        return;
      }
      if (this.currentForm.invalid) {
        this.currentForm.markAllAsTouched();
        return;
      }
      this.editingFromReview = false;
      this.currentStep = 6;
      return;
    }

    if (this.currentStep === 3) {
      if (!this.cvOption) {
        this.cvError = true;
        return;
      }
      this.cvError = false;
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
      return;
    }

    if (this.currentForm.invalid) {
      this.currentForm.markAllAsTouched();
      return;
    }

    if (this.currentStep === 4) {
      // Go to preparation step
      this.currentStep = 5;
      this.startPreparation();
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  onPrevious(): void {
    if (this.editingFromReview) {
      this.editingFromReview = false;
      this.closePdfPreview();
      this.currentStep = 6;
      return;
    }
    if (this.currentStep > 1) {
      this.closePdfPreview();
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    this.editingFromReview = true;
    this.currentStep = step;
  }

  private startPreparation(): void {
    this.preparationProgress = 0;
    this.cdr.detectChanges();

    // → 33% après 0.5s
    setTimeout(() => {
      this.preparationProgress = 33;
      this.cdr.detectChanges();
    }, 500);

    // → 67% après 1s
    setTimeout(() => {
      this.preparationProgress = 67;
      this.cdr.detectChanges();
    }, 1000);

    // → 100% après 1.5s
    setTimeout(() => {
      this.preparationProgress = 100;
      this.cdr.detectChanges();
    }, 1500);

    // Afficher le formulaire après 2s (transition 100% terminée)
    this.preparationTimer = setTimeout(() => {
      this.preparationTimer = null;
      this.currentStep = 6;
      this.cdr.detectChanges();
    }, 2000);
  }

  // ── Step 6: Review helpers ──

  get reviewCvName(): string {
    if (this.cvOption === 'upload') return this.uploadedCvName;
    if (this.cvOption === 'profile') return this.profileCvName;
    return this.translate.instant('apply.no_cv');
  }

  get contactFullName(): string {
    const first = this.contactForm.get('firstName')?.value || '';
    const last = this.contactForm.get('lastName')?.value || '';
    return `${first} ${last}`.trim();
  }

  downloadCv(): void {
    if (this.cvOption === 'upload' && this.uploadedCvFile) {
      const url = URL.createObjectURL(this.uploadedCvFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.uploadedCvName;
      a.click();
      URL.revokeObjectURL(url);
    } else if (this.cvOption === 'profile') {
      const cvUrl = this.freelancer()?.cvUrl;
      if (cvUrl) {
        const fullUrl = environment.apiUrl.replace(/\/api$/, '') + cvUrl;
        const a = document.createElement('a');
        a.href = fullUrl;
        a.download = this.profileCvName;
        a.target = '_blank';
        a.click();
      }
    }
  }

  saveAndClose(): void {
    const missionId = this.mission()?.id;
    if (missionId) {
      this.router.navigate(['/missions', missionId]);
    } else {
      this.router.navigate(['/missions']);
    }
  }

  withdrawApplication(): void {
    this.showWithdrawToast.set(true);
    setTimeout(() => {
      this.showWithdrawToast.set(false);
      this.router.navigate(['/missions']);
    }, 2000);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.currentForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  isQuestionInvalid(fieldName: string): boolean {
    const control = this.questionsForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  getTruncatedDescription(text: string | undefined, maxLength = 200): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  onSubmitApplication(): void {
    if (this.submitting()) return;

    this.submitting.set(true);
    this.submitError.set('');

    const missionId = this.mission()?.id;
    if (!missionId) {
      this.submitError.set('Mission not found.');
      this.submitting.set(false);
      return;
    }

    // If freelancer uploaded a new CV, upload it first
    if (this.cvOption === 'upload' && this.uploadedCvFile) {
      this.cvService.uploadCv(this.uploadedCvFile).subscribe({
        next: (res) => {
          this.sendApplication(missionId, res.url);
        },
        error: () => {
          this.submitError.set('Failed to upload CV. Please try again.');
          this.submitting.set(false);
        },
      });
    } else {
      // Use profile CV URL or no CV
      const cvUrl = this.cvOption === 'profile' ? this.freelancer()?.cvUrl || '' : '';
      this.sendApplication(missionId, cvUrl);
    }
  }

  private sendApplication(missionId: string, cvUrl: string): void {
    const request: CreateApplicationRequest = {
      missionId,
      firstName: this.contactForm.get('firstName')?.value,
      lastName: this.contactForm.get('lastName')?.value,
      phoneNumber: this.contactForm.get('phoneNumber')?.value,
      country: this.locationForm.get('country')?.value,
      postalCode: this.locationForm.get('postalCode')?.value,
      city: this.locationForm.get('city')?.value,
      cvUrl,
      salaryExpectations: this.questionsForm.get('salaryExpectations')?.value,
      currentSalaryAndNotice: this.questionsForm.get('currentSalaryAndNotice')?.value,
      previouslyWorked: this.questionsForm.get('previouslyWorked')?.value,
      previousWorkDate: this.questionsForm.get('previousWorkDate')?.value || undefined,
      previousWorkExperience: this.questionsForm.get('previousWorkExperience')?.value || undefined,
    };

    this.applicationService.submitApplication(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/missions']);
      },
      error: (err) => {
        this.submitting.set(false);
        if (err.status === 402) {
          this.submitError.set(
            (err.error?.message ?? 'Solde insuffisant.') +
            ' Rechargez vos points sur la page Offres.'
          );
        } else {
          const message = err.error?.message || err.error?.error || 'Failed to submit application. Please try again.';
          this.submitError.set(message);
        }
      },
    });
  }
}
