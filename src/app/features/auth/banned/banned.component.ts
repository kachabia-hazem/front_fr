import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReportModalComponent } from '../../../shared/report-modal/report-modal.component';

@Component({
  selector: 'app-banned',
  standalone: true,
  imports: [CommonModule, ReportModalComponent],
  templateUrl: './banned.component.html',
  styleUrl: './banned.component.css',
})
export class BannedComponent implements OnInit {
  banReason = '';
  email = '';
  showReportModal = signal(false);
  reportSubmitted = signal(false);

  constructor(private router: Router) {}

  ngOnInit(): void {
    const state = history.state as { banReason?: string; email?: string };
    this.banReason = state?.banReason ?? '';
    this.email = state?.email ?? '';
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  openReport(): void {
    this.showReportModal.set(true);
  }

  onReportSubmitted(): void {
    this.showReportModal.set(false);
    this.reportSubmitted.set(true);
  }
}
