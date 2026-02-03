import { Component, Input, Output, EventEmitter, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { FileUploadComponent } from '../../../../../../shared/components/file-upload/file-upload.component';
import { CvService } from '../../../../../../core/services/cv.service';

@Component({
  selector: 'app-step-skills-certifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent],
  templateUrl: './step-skills-certifications.component.html',
  styleUrl: './step-skills-certifications.component.css',
})
export class StepSkillsCertificationsComponent {
  @Input() form!: FormGroup;
  @Input() certificationsArray!: FormArray;
  @Output() addCertification = new EventEmitter<void>();

  newSkill = signal('');
  uploadingIndex = signal<number | null>(null);

  constructor(private cvService: CvService) {}

  get skills(): string[] {
    return this.form.get('skills')?.value || [];
  }

  addSkill(): void {
    const skill = this.newSkill().trim();
    if (skill && !this.skills.includes(skill)) {
      this.form.get('skills')?.setValue([...this.skills, skill]);
      this.newSkill.set('');
    }
  }

  removeSkill(index: number): void {
    const updated = this.skills.filter((_, i) => i !== index);
    this.form.get('skills')?.setValue(updated);
  }

  onSkillInput(event: Event): void {
    this.newSkill.set((event.target as HTMLInputElement).value);
  }

  onSkillKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSkill();
    }
  }

  removeCertification(index: number): void {
    this.certificationsArray.removeAt(index);
  }

  onFileSelected(file: File, index: number): void {
    this.uploadingIndex.set(index);
    this.cvService.uploadCertificate(file).subscribe({
      next: (response) => {
        this.certificationsArray.at(index).get('certificateUrl')?.setValue(response.url);
        this.uploadingIndex.set(null);
      },
      error: () => {
        this.uploadingIndex.set(null);
      },
    });
  }
}
