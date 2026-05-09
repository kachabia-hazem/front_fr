import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LegitService } from '../../../core/services/legit.service';
import { Legit, LegitStatus } from '../../../core/models/legit.model';
import { environment } from '../../../../environments/environment';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-legits',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-legits.component.html',
  styleUrls: ['./admin-legits.component.css'],
})
export class AdminLegitsComponent implements OnInit, OnDestroy{

  legits   = signal<Legit[]>([]);
  stats    = signal<Record<string, number>>({});
  loading  = signal(true);

  statusFilter = signal('ALL');
  searchQuery  = signal('');

  selected = signal<Legit | null>(null);

  // Email modal
  emailTarget  = signal<Legit | null>(null);
  emailSubject = signal('');
  emailBody    = signal('');
  sending      = signal(false);

  // Cancel mission modal
  cancelTarget  = signal<Legit | null>(null);
  cancelReason  = signal('');

  // Refund modal
  refundTarget        = signal<Legit | null>(null);
  freelancerPct       = signal(50);
  companyPct          = signal(50);
  refundReason        = signal('');

  // Continue mission modal
  continueTarget = signal<Legit | null>(null);
  continueNote   = signal('');

  processing = signal<string | null>(null);

  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  private langSub?: Subscription;

  readonly TABS = ['ALL', 'EN_ATTENTE', 'EN_COURS', 'RESOLU', 'REJETE'];

  filteredLegits = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.legits().filter(l => {
      const matchQ = !q || [l.reporterName, l.reporterEmail, l.missionTitle, l.description]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
      const matchS = s === 'ALL' || l.status === s;
      return matchQ && matchS;
    });
  });

  pendingCount = computed(() => this.legits().filter(l => l.status === 'EN_ATTENTE').length);

  constructor(
    private legitService: LegitService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck()); this.load(); }

  private load() {
    this.loading.set(true);
    this.legitService.getAllLegits().subscribe({
      next: (data) => { this.legits.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.legitService.getStats().subscribe({
      next: (data) => this.stats.set(data),
    });
  }

  select(l: Legit) {
    this.selected.set(this.selected()?.id === l.id ? null : l);
  }

  closePanel() { this.selected.set(null); }

  setStatus(l: Legit, status: LegitStatus, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.processing()) return;
    this.processing.set(l.id);
    this.legitService.updateStatus(l.id, status).subscribe({
      next: (updated) => {
        this.updateLegit(updated);
        this.processing.set(null);
        this.showToast(this.translate.instant('admin_legits.toast_status_ok'), 'success');
      },
      error: () => {
        this.processing.set(null);
        this.showToast(this.translate.instant('admin_legits.toast_status_err'), 'error');
      },
    });
  }

  openEmailModal(l: Legit, event?: MouseEvent) {
    event?.stopPropagation();
    this.emailTarget.set(l);
    this.emailSubject.set(this.translate.instant('admin_legits.default_subject'));
    this.emailBody.set('');
  }

  closeEmailModal() {
    this.emailTarget.set(null);
    this.emailSubject.set('');
    this.emailBody.set('');
  }

  confirmSendEmail() {
    const target = this.emailTarget();
    if (!target || !this.emailSubject().trim() || !this.emailBody().trim()) return;
    this.sending.set(true);
    this.legitService.sendEmail(target.id, this.emailSubject(), this.emailBody()).subscribe({
      next: (updated) => {
        this.updateLegit(updated);
        this.sending.set(false);
        this.closeEmailModal();
        this.showToast(this.translate.instant('admin_legits.email_toast_ok'), 'success');
      },
      error: () => {
        this.sending.set(false);
        this.showToast(this.translate.instant('admin_legits.email_toast_err'), 'error');
      },
    });
  }

  // ── Cancel mission ──────────────────────────────────────────────────────────

  openCancelModal(l: Legit, event?: MouseEvent) {
    event?.stopPropagation();
    this.cancelTarget.set(l);
    this.cancelReason.set('');
  }

  closeCancelModal() { this.cancelTarget.set(null); this.cancelReason.set(''); }

  confirmCancelMission() {
    const target = this.cancelTarget();
    if (!target) return;
    this.processing.set(target.id);
    this.legitService.cancelMission(target.id, this.cancelReason()).subscribe({
      next: (updated) => {
        this.updateLegit(updated);
        this.processing.set(null);
        this.closeCancelModal();
        this.showToast('Mission annulée avec succès', 'success');
      },
      error: () => {
        this.processing.set(null);
        this.showToast('Erreur lors de l\'annulation', 'error');
      },
    });
  }

  // ── Refund mission ──────────────────────────────────────────────────────────

  openRefundModal(l: Legit, event?: MouseEvent) {
    event?.stopPropagation();
    this.refundTarget.set(l);
    this.freelancerPct.set(50);
    this.companyPct.set(50);
    this.refundReason.set('');
  }

  closeRefundModal() { this.refundTarget.set(null); }

  onFreelancerPctChange(val: number) {
    const v = Math.max(0, Math.min(100, val));
    this.freelancerPct.set(v);
    this.companyPct.set(100 - v);
  }

  onCompanyPctChange(val: number) {
    const v = Math.max(0, Math.min(100, val));
    this.companyPct.set(v);
    this.freelancerPct.set(100 - v);
  }

  confirmRefundMission() {
    const target = this.refundTarget();
    if (!target) return;
    this.processing.set(target.id);
    this.legitService.refundMission(target.id, this.freelancerPct(), this.companyPct(), this.refundReason()).subscribe({
      next: (updated) => {
        this.updateLegit(updated);
        this.processing.set(null);
        this.closeRefundModal();
        this.showToast('Remboursement enregistré', 'success');
      },
      error: () => {
        this.processing.set(null);
        this.showToast('Erreur lors du remboursement', 'error');
      },
    });
  }

  // ── Continue mission ────────────────────────────────────────────────────────

  openContinueModal(l: Legit, event?: MouseEvent) {
    event?.stopPropagation();
    this.continueTarget.set(l);
    this.continueNote.set('');
  }

  closeContinueModal() { this.continueTarget.set(null); this.continueNote.set(''); }

  confirmContinueMission() {
    const target = this.continueTarget();
    if (!target) return;
    this.processing.set(target.id);
    this.legitService.continueMission(target.id, this.continueNote()).subscribe({
      next: (updated) => {
        this.updateLegit(updated);
        this.processing.set(null);
        this.closeContinueModal();
        this.showToast('Mission relancée avec succès', 'success');
      },
      error: () => {
        this.processing.set(null);
        this.showToast('Erreur lors de la relance', 'error');
      },
    });
  }

  tabLabel(s: string): string {
    if (s === 'ALL') return this.translate.instant('admin_legits.tab_all');
    return this.translate.instant('admin_legits.status_' + s.toLowerCase());
  }

  statVal(k: string): number { return this.stats()[k] ?? 0; }

  formatDate(d: string): string {
    if (!d) return '';
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png)$/i.test(url);
  }

  getFileUrl(relativePath: string): string {
    const base = environment.apiUrl.replace(/\/api$/, '');
    return base + relativePath;
  }

  getFileName(url: string): string {
    return url.split('/').pop() || url;
  }

  private updateLegit(updated: Legit) {
    this.legits.update(list => list.map(l => l.id === updated.id ? updated : l));
    if (this.selected()?.id === updated.id) this.selected.set(updated);
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
