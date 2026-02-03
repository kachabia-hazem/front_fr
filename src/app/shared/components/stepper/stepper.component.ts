import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Step {
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.css',
})
export class StepperComponent {
  @Input() steps: Step[] = [];
  @Input() currentStep = 0;
  @Output() stepChange = new EventEmitter<number>();

  goToStep(index: number): void {
    if (index <= this.currentStep) {
      this.stepChange.emit(index);
    }
  }

  isCompleted(index: number): boolean {
    return index < this.currentStep;
  }

  isActive(index: number): boolean {
    return index === this.currentStep;
  }

  isPending(index: number): boolean {
    return index > this.currentStep;
  }
}
