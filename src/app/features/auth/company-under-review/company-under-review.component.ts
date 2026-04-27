import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company-under-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-under-review.component.html',
  styleUrl: './company-under-review.component.css',
})
export class CompanyUnderReviewComponent implements OnInit, OnDestroy {
  status: 'PENDING' | 'REJECTED' = 'PENDING';

  // Animated dots for the scanning effect
  steps = [
    { label: 'Company information verified', done: false, active: false },
    { label: 'Documents under review', done: false, active: false },
    { label: 'Trust score analysis', done: false, active: false },
    { label: 'Final admin approval', done: false, active: false },
  ];

  private stepInterval: any = null;
  private currentStep = 0;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { status?: string } | undefined;
    if (state?.status === 'REJECTED') {
      this.status = 'REJECTED';
    } else {
      // Read from history.state if navigated with data
      const historyState = history.state as { status?: string };
      if (historyState?.status === 'REJECTED') {
        this.status = 'REJECTED';
      }
    }

    if (this.status === 'PENDING') {
      this.animateSteps();
    }
  }

  ngOnDestroy(): void {
    if (this.stepInterval) clearInterval(this.stepInterval);
  }

  private animateSteps(): void {
    // Start first step immediately
    this.steps[0].active = true;

    this.stepInterval = setInterval(() => {
      if (this.currentStep < this.steps.length) {
        // Mark current as done
        this.steps[this.currentStep].done = true;
        this.steps[this.currentStep].active = false;
        this.currentStep++;

        // Activate next
        if (this.currentStep < this.steps.length) {
          this.steps[this.currentStep].active = true;
        } else {
          // All done — loop back after short pause
          setTimeout(() => {
            this.steps.forEach(s => { s.done = false; s.active = false; });
            this.currentStep = 0;
            this.steps[0].active = true;
          }, 1500);
        }
      }
    }, 1800);
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
