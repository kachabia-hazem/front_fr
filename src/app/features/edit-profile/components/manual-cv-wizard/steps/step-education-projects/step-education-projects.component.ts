import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-step-education-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-education-projects.component.html',
  styleUrl: './step-education-projects.component.css',
})
export class StepEducationProjectsComponent {
  @Input() form!: FormGroup;
  @Input() educationArray!: FormArray;
  @Input() projectsArray!: FormArray;
  @Output() addEducation = new EventEmitter<void>();
  @Output() addProject = new EventEmitter<void>();

  removeEducation(index: number): void {
    this.educationArray.removeAt(index);
  }

  removeProject(index: number): void {
    this.projectsArray.removeAt(index);
  }

  onTechnologiesInput(event: Event, index: number): void {
    const input = (event.target as HTMLInputElement).value;
    const technologies = input.split(',').map(t => t.trim()).filter(t => t);
    this.projectsArray.at(index).get('technologies')?.setValue(technologies);
  }

  getTechnologiesString(index: number): string {
    const techs = this.projectsArray.at(index).get('technologies')?.value;
    return Array.isArray(techs) ? techs.join(', ') : '';
  }

  currentYear = new Date().getFullYear();
}
