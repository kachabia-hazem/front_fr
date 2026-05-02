import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LegitService } from '../../core/services/legit.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-legit-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './legit-form.component.html',
  styleUrl: './legit-form.component.css',
})
export class LegitFormComponent implements OnInit {
  missionId = '';

  description = '';
  totalAmount: number | null = null;
  resolution = '';

  evidenceFiles = signal<string[]>([]);
  uploadingFiles = signal<boolean[]>([]);
  selectedFileNames = signal<string[]>([]);

  submitting = signal(false);
  submitted = signal(false);
  error = signal('');
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private legitService: LegitService,
  ) {}

  ngOnInit(): void {
    this.missionId = this.route.snapshot.paramMap.get('missionId') || '';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    files.forEach(file => this.uploadFile(file));
    input.value = '';
  }

  private uploadFile(file: File): void {
    const index = this.uploadingFiles().length;
    this.uploadingFiles.update(arr => [...arr, true]);
    this.selectedFileNames.update(arr => [...arr, file.name]);

    this.legitService.uploadEvidence(file).subscribe({
      next: (res) => {
        this.evidenceFiles.update(arr => [...arr, res.url]);
        this.uploadingFiles.update(arr => arr.map((v, i) => i === index ? false : v));
      },
      error: () => {
        this.uploadingFiles.update(arr => arr.map((v, i) => i === index ? false : v));
        this.showToast('Failed to upload file: ' + file.name, 'error');
      },
    });
  }

  removeFile(index: number): void {
    this.evidenceFiles.update(arr => arr.filter((_, i) => i !== index));
    this.selectedFileNames.update(arr => arr.filter((_, i) => i !== index));
    this.uploadingFiles.update(arr => arr.filter((_, i) => i !== index));
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png)$/i.test(url);
  }

  getFileUrl(relativePath: string): string {
    const base = environment.apiUrl.replace(/\/api$/, '');
    return base + relativePath;
  }

  getFileName(url: string): string {
    return url.split('/').pop() || url;
  }

  canSubmit(): boolean {
    return !!this.description.trim() && !!this.resolution.trim() && !this.submitting();
  }

  isUploading(): boolean {
    return this.uploadingFiles().some(v => v);
  }

  submit(): void {
    if (!this.canSubmit() || this.isUploading()) return;
    this.submitting.set(true);
    this.error.set('');

    this.legitService.createLegit({
      activeMissionId: this.missionId,
      description: this.description.trim(),
      totalAmount: this.totalAmount,
      resolution: this.resolution.trim(),
      evidenceFiles: this.evidenceFiles(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
        this.showToast(
          'Votre demande a bien été soumise. Notre équipe administrative va la traiter et vous contactera dans les plus brefs délais.',
          'success',
        );
        setTimeout(() => this.router.navigate([this.missionId ? '/active-mission/' + this.missionId : '/dashboard']), 4500);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Une erreur est survenue. Veuillez réessayer.');
      },
    });
  }

  goBack(): void {
    this.router.navigate([this.missionId ? '/active-mission/' + this.missionId : '/dashboard']);
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 5000);
  }
}
