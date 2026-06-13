import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ReportService } from '../../../core/services/report.service';
import { Report, ReportStatus } from '../../../core/models/report.model';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.css'],
})
export class AdminReportsComponent implements OnInit, OnDestroy{

  reports  = signal<Report[]>([]);
  stats    = signal<Record<string, number>>({});
  loading  = signal(true);

  statusFilter = signal('ALL');
  searchQuery  = signal('');

  selected = signal<Report | null>(null);

  rejectTarget = signal<Report | null>(null);
  rejectReason = signal('');
  rejecting    = signal(false);

  processing = signal<string | null>(null);

  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  private langSub?: Subscription;

  readonly TABS = ['ALL', 'EN_ATTENTE', 'EN_COURS', 'REJETE'];

  filteredReports = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.reports().filter(r => {
      const matchQ = !q || [
        r.reportedByName,
        r.type, r.description, r.customType
      ].filter(Boolean).join(' ').toLowerCase().includes(q);
      const matchS = s === 'ALL' || r.status === s;
      return matchQ && matchS;
    });
  });

  pendingCount = computed(() => this.reports().filter(r => r.status === 'EN_ATTENTE').length);

  constructor(
    private reportService: ReportService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck()); this.load(); }

  private load() {
    this.loading.set(true);
    this.reportService.getAllReports().subscribe({
      next: (data) => { this.reports.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.reportService.getStats().subscribe({
      next: (data) => this.stats.set(data),
    });
  }

  select(r: Report) {
    this.selected.set(this.selected()?.id === r.id ? null : r);
  }

  closePanel() { this.selected.set(null); }

  setStatus(r: Report, status: ReportStatus, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.processing()) return;
    this.processing.set(r.id);
    this.reportService.updateStatus(r.id, status).subscribe({
      next: (updated) => {
        this.updateReport(updated);
        this.processing.set(null);
        this.showToast(this.translate.instant('admin_reports.toast_status_ok'), 'success');
      },
      error: () => {
        this.processing.set(null);
        this.showToast(this.translate.instant('admin_reports.toast_status_err'), 'error');
      },
    });
  }

  openRejectModal(r: Report, event?: MouseEvent) {
    event?.stopPropagation();
    this.rejectTarget.set(r);
    this.rejectReason.set('');
  }

  closeRejectModal() { this.rejectTarget.set(null); this.rejectReason.set(''); }

  confirmReject() {
    const target = this.rejectTarget();
    if (!target || !this.rejectReason().trim()) return;
    this.rejecting.set(true);
    this.reportService.rejectReport(target.id, this.rejectReason()).subscribe({
      next: (updated) => {
        this.updateReport(updated);
        this.rejecting.set(false);
        this.closeRejectModal();
        this.showToast(this.translate.instant('admin_reports.toast_reject_ok'), 'success');
      },
      error: () => {
        this.rejecting.set(false);
        this.showToast(this.translate.instant('admin_reports.toast_reject_err'), 'error');
      },
    });
  }

  typeLabel(type: string): string {
    return this.translate.instant('admin_reports.type_' + type.toLowerCase());
  }

  statusLabel(status: string): string {
    return this.translate.instant('admin_reports.status_' + status.toLowerCase());
  }

  tabLabel(s: string): string {
    if (s === 'ALL') return this.translate.instant('admin_reports.tab_all');
    return this.translate.instant('admin_reports.status_' + s.toLowerCase());
  }

  statVal(k: string): number { return this.stats()[k] ?? 0; }

  formatDate(d: string): string {
    if (!d) return '';
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private updateReport(updated: Report) {
    this.reports.update(list => list.map(r => r.id === updated.id ? updated : r));
    if (this.selected()?.id === updated.id) this.selected.set(updated);
    this.stats.update(s => ({
      ...s,
      EN_ATTENTE: this.reports().filter(r => r.status === 'EN_ATTENTE').length,
    }));
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
