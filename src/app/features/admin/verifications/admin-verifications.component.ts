import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { Company } from '../../../core/models/user.model';
import { CompanyStatus } from '../../../core/models/enums.model';

@Component({
  selector: 'app-admin-verifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-verifications.component.html',
  styleUrls: ['./admin-verifications.component.css'],
})
export class AdminVerificationsComponent implements OnInit {
  companies = signal<Company[]>([]);
  loading = signal(true);
  selectedCompany = signal<Company | null>(null);
  rejectReason = signal('');
  showRejectModal = signal(false);
  companyToReject = signal<Company | null>(null);
  actionLoading = signal<string | null>(null);
  filter = signal<'PENDING' | 'ALL' | 'APPROVED' | 'REJECTED'>('ALL');
  toastMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  CompanyStatus = CompanyStatus;

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.loading.set(true);
    const obs = this.filter() === 'PENDING'
      ? this.adminService.getPendingCompanies()
      : this.adminService.getAllCompanies();

    obs.subscribe({
      next: (data) => {
        let filtered = data;
        if (this.filter() !== 'PENDING' && this.filter() !== 'ALL') {
          filtered = data.filter(c => c.verificationStatus === this.filter());
        }
        this.companies.set(filtered);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setFilter(f: 'PENDING' | 'ALL' | 'APPROVED' | 'REJECTED') {
    this.filter.set(f);
    this.loadCompanies();
  }

  selectCompany(c: Company) {
    this.router.navigate(['/admin/verifications', c.id]);
  }

  closePanel() {
    this.selectedCompany.set(null);
  }

  approve(company: Company) {
    this.actionLoading.set(company.id);
    this.adminService.approveCompany(company.id).subscribe({
      next: () => {
        this.showToast('Company approved successfully', 'success');
        this.selectedCompany.set(null);
        this.loadCompanies();
        this.actionLoading.set(null);
      },
      error: () => {
        this.showToast('Failed to approve company', 'error');
        this.actionLoading.set(null);
      },
    });
  }

  openRejectModal(company: Company) {
    this.companyToReject.set(company);
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  confirmReject() {
    const company = this.companyToReject();
    if (!company) return;
    this.actionLoading.set(company.id);
    this.adminService.rejectCompany(company.id, this.rejectReason()).subscribe({
      next: () => {
        this.showToast('Company rejected', 'success');
        this.showRejectModal.set(false);
        this.selectedCompany.set(null);
        this.loadCompanies();
        this.actionLoading.set(null);
      },
      error: () => {
        this.showToast('Failed to reject company', 'error');
        this.actionLoading.set(null);
      },
    });
  }

  cancelReject() {
    this.showRejectModal.set(false);
    this.companyToReject.set(null);
  }

  refreshScore(company: Company) {
    this.adminService.refreshTrustScore(company.id).subscribe({
      next: (updated) => {
        this.selectedCompany.set(updated);
        this.showToast('Trust score refreshed', 'success');
        this.loadCompanies();
      },
      error: () => this.showToast('Failed to refresh score', 'error'),
    });
  }

  getTrustLabel(score: number | undefined): string {
    if (score === undefined || score === null) return 'N/A';
    if (score >= 75) return 'TRUSTED';
    if (score >= 45) return 'REVIEW';
    return 'SUSPICIOUS';
  }

  getTrustClass(score: number | undefined): string {
    if (score === undefined || score === null) return 'na';
    if (score >= 75) return 'trusted';
    if (score >= 45) return 'review';
    return 'suspicious';
  }

  private showToast(text: string, type: 'success' | 'error') {
    this.toastMessage.set({ text, type });
    setTimeout(() => this.toastMessage.set(null), 3500);
  }
}
