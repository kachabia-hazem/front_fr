import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-modal.component.html',
  styleUrl: './feedback-modal.component.css',
})
export class FeedbackModalComponent {
  @Input() missionId = '';

  /** Emit when the modal should close (either after submit or "Later") */
  @Output() closed = new EventEmitter<void>();

  selectedRating = signal(0);
  comment = '';
  submitting = signal(false);
  submitted  = signal(false);

  readonly stars = [1, 2, 3, 4, 5];

  constructor(private feedbackService: FeedbackService) {}

  setRating(value: number): void {
    this.selectedRating.set(value);
  }

  submit(): void {
    if (this.selectedRating() === 0) return;
    this.submitting.set(true);

    this.feedbackService.submitFeedback({
      missionId:  this.missionId,
      rating:     this.selectedRating(),
      comment:    this.comment.trim() || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
        setTimeout(() => this.closed.emit(), 1600);
      },
      error: () => {
        this.submitting.set(false);
        this.closed.emit();
      },
    });
  }

  later(): void {
    this.closed.emit();
  }
}
