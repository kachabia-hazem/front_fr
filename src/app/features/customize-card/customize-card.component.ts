import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FreelancerService } from '../../core/services/freelancer.service';
import { CvService } from '../../core/services/cv.service';
import { Freelancer } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-customize-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './customize-card.component.html',
  styleUrl: './customize-card.component.css',
})
export class CustomizeCardComponent implements OnInit {
  freelancer = signal<Freelancer | null>(null);
  cardBackground = signal<string>('');
  portfolioImages = signal<string[]>([]);
  saving = signal(false);
  uploading = signal(false);
  message = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  showToast = signal(false);
  toastMessage = signal('');

  readonly maxPortfolioImages = 5;

  constructor(
    private freelancerService: FreelancerService,
    private cvService: CvService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({
      next: (profile) => {
        this.freelancer.set(profile);
        this.cardBackground.set(profile.cardBackground || '');
        this.portfolioImages.set(profile.portfolioImages || []);
      },
    });
  }

  getFileUrl(path: string): string {
    if (!path) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + path;
  }

  get cardPreviewImage(): string {
    const images = this.portfolioImages();
    if (images.length > 0) return this.getFileUrl(images[0]);
    if (this.cardBackground()) return this.getFileUrl(this.cardBackground());
    return '';
  }

  onBackgroundUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploading.set(true);
    this.cvService.uploadPortfolioImage(file).subscribe({
      next: (res) => {
        this.cardBackground.set(res.url);
        this.uploading.set(false);
      },
      error: () => {
        this.showMessage('error', this.translate.instant('customize_card.bg_upload_error'));
        this.uploading.set(false);
      },
    });
    input.value = '';
  }

  onPortfolioUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    if (this.portfolioImages().length >= this.maxPortfolioImages) {
      this.showMessage('error', this.translate.instant('customize_card.portfolio_hint', { max: this.maxPortfolioImages }));
      return;
    }
    const file = input.files[0];
    this.uploading.set(true);
    this.cvService.uploadPortfolioImage(file).subscribe({
      next: (res) => {
        this.portfolioImages.set([...this.portfolioImages(), res.url]);
        this.uploading.set(false);
      },
      error: () => {
        this.showMessage('error', this.translate.instant('customize_card.portfolio_upload_error'));
        this.uploading.set(false);
      },
    });
    input.value = '';
  }

  removePortfolioImage(index: number): void {
    const images = [...this.portfolioImages()];
    images.splice(index, 1);
    this.portfolioImages.set(images);
  }

  removeBackground(): void {
    this.cardBackground.set('');
  }

  moveImage(index: number, direction: -1 | 1): void {
    const images = [...this.portfolioImages()];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;
    [images[index], images[newIndex]] = [images[newIndex], images[index]];
    this.portfolioImages.set(images);
  }

  save(): void {
    this.saving.set(true);
    this.cvService.updateCardCustomization({
      cardBackground: this.cardBackground(),
      portfolioImages: this.portfolioImages(),
    }).subscribe({
      next: (updated) => {
        this.freelancer.set(updated);
        this.saving.set(false);
        this.showSuccessToast(this.translate.instant('customize_card.save_success'));
      },
      error: () => {
        this.saving.set(false);
        this.showMessage('error', this.translate.instant('customize_card.save_error'));
      },
    });
  }

  private showMessage(type: 'success' | 'error', text: string): void {
    this.message.set({ type, text });
    setTimeout(() => this.message.set(null), 4000);
  }

  private showSuccessToast(message: string): void {
    this.toastMessage.set(message);
    this.showToast.set(true);
    this.cdr.detectChanges();
    setTimeout(() => {
      this.router.navigate(['/freelancers']);
    }, 2500);
  }
}
