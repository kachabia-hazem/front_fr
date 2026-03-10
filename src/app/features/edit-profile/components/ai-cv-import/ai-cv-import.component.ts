import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CvService, ExtractedCvData } from '../../../../core/services/cv.service';

@Component({
  selector: 'app-ai-cv-import',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-cv-import.component.html',
  styleUrl: './ai-cv-import.component.css',
})
export class AiCvImportComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() extracted = new EventEmitter<ExtractedCvData>();

  selectedFile = signal<File | null>(null);
  loading = signal(false);
  errorMessage = signal('');
  result = signal<ExtractedCvData | null>(null);

  constructor(private cvService: CvService) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.errorMessage.set('Only PDF files are supported.');
        return;
      }
      this.selectedFile.set(file);
      this.errorMessage.set('');
      this.result.set(null);
    }
  }

  extract(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.loading.set(true);
    this.errorMessage.set('');
    this.result.set(null);

    this.cvService.extractCvFromFile(file).subscribe({
      next: (data) => {
        this.result.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        const status = err?.status;
        if (status === 401 || status === 403) {
          this.errorMessage.set('Authentication error. Please log out and log in again.');
        } else if (status === 503) {
          this.errorMessage.set('AI service is unavailable. Make sure the Python AI service and Ollama are running.');
        } else if (status === 404) {
          this.errorMessage.set('Endpoint not found (404). Restart Spring Boot.');
        } else {
          this.errorMessage.set(`Extraction failed (${status ?? 'network error'}). Check that all services are running.`);
        }
        this.loading.set(false);
      },
    });
  }

  apply(): void {
    const data = this.result();
    if (data) {
      this.extracted.emit(data);
    }
  }

  close(): void {
    this.closed.emit();
  }

  get workExpCount(): number {
    return this.result()?.workExperience?.length ?? 0;
  }

  get educationCount(): number {
    return this.result()?.education?.length ?? 0;
  }

  get certifCount(): number {
    return this.result()?.certifications?.length ?? 0;
  }

  get skillsCount(): number {
    return this.result()?.skills?.length ?? 0;
  }

  get languagesList(): string {
    const langs = this.result()?.languages;
    if (!langs || langs.length === 0) return 'None detected';
    return langs.map(l => l.charAt(0) + l.slice(1).toLowerCase()).join(', ');
  }

  get hasBio(): boolean {
    return !!this.result()?.bio;
  }
}
