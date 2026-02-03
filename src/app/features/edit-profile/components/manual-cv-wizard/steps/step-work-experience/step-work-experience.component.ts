import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { RichTextEditorComponent } from '../../../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-step-work-experience',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RichTextEditorComponent],
  templateUrl: './step-work-experience.component.html',
  styleUrl: './step-work-experience.component.css',
})
export class StepWorkExperienceComponent {
  @Input() form!: FormGroup;
  @Input() workExperienceArray!: FormArray;
  @Output() addExperience = new EventEmitter<void>();

  removeExperience(index: number): void {
    this.workExperienceArray.removeAt(index);
  }

  onCurrentChange(event: Event, index: number): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.workExperienceArray.at(index).get('isCurrent')?.setValue(checked);
    if (checked) {
      this.workExperienceArray.at(index).get('endDate')?.setValue('');
    }
  }

  isCurrentJob(index: number): boolean {
    return this.workExperienceArray.at(index).get('isCurrent')?.value === true;
  }
}
