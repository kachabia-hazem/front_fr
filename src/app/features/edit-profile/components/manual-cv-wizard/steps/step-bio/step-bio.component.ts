import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RichTextEditorComponent } from '../../../../../../shared/components/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-step-bio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RichTextEditorComponent],
  templateUrl: './step-bio.component.html',
  styleUrl: './step-bio.component.css',
})
export class StepBioComponent {
  @Input() form!: FormGroup;
}
