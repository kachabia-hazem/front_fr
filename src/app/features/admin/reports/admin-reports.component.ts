import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../core/services/report.service';
import { Report, ReportStatus } from '../../../core/models/report.model';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.css'],
})
export class AdminReportsComponent implements OnInit {

  reports  = signal<Report[]>([]);
  stats    = signal<Record<string, number>>({});
  loading  = signal(true);

  statusFilter = signal('ALL');
  searchQuery  = signal('');

  selected = signal<Report | null>(null);

  warnTarget  = signal<Report | null>(null);
  warnNote    = signal('');
  warning     = signal(false);

  rejectTarget = signal<Report | null>(null);
  rejectReason = signal('');
  rejecting    = signal(false);

  processing = signal<string | null>(null);

  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  readonly TABS = ['ALL', 'EN_ATTENTE', 'EN_COURS', 'TRAITE', 'REJETE'];

  readonly TYPE_LABELS: Record<string, string> = {
    FRAUDE:                 'Fraude',
    COMPORTEMENT:           'Comportement',
    PAIEMENT:               'Paiement',
    DOCUMENT_FALSIFIE:      'Document falsifié',
    HORS_SUJET:             'Hors-sujet',
    BUG_TECHNIQUE:          'Bug technique',
    PROBLEME_NOTIFICATION:  'Notifications',
    PROBLEME_MESSAGERIE:    'Messagerie',
    ACCES_FONCTIONNALITE:   'Accès refusé',
    CONTENU_INAPPROPRIE:    'Contenu inapproprié',
    COMPTE_INJUSTE:         'Suspension injuste',
    AUTRE:                  'Autre',
  };

  readonly STATUS_LABELS: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    EN_COURS: 'En cours',
    TRAITE: 'Traité',
    REJETE: 'Rejeté',
  };

  filteredReports = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.reports().filter(r => {
      const matchQ = !q || [
        r.reportedByName,
        this.TYPE_LABELS[r.type], r.description, r.customType
      ].filter(Boolean).join(' ').toLowerCase().includes(q);
      const matchS = s === 'ALL' || r.status === s;
      return matchQ && matchS;
    });
  });

  pendingCount = computed(() => this.reports().filter(r => r.status === 'EN_ATTENTE').length);

  constructor(private reportService: ReportService) {}

  ngOnInit() { this.load(); }

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
      next: (updated) => { this.updateReport(updated); this.processing.set(null); this.showToast('Statut mis à jour.', 'success'); },
      error: () => { this.processing.set(null); this.showToast('Erreur lors de la mise à jour.', 'error'); },
    });
  }

  openWarnModal(r: Report, event?: MouseEvent) {
    event?.stopPropagation();
    this.warnTarget.set(r);
    this.warnNote.set('');
  }

  closeWarnModal() { this.warnTarget.set(null); this.warnNote.set(''); }

  confirmWarn() {
    const target = this.warnTarget();
    if (!target || !this.warnNote().trim()) return;
    this.warning.set(true);
    this.reportService.warnReporter(target.id, this.warnNote()).subscribe({
      next: (updated) => {
        this.updateReport(updated);
        this.warning.set(false);
        this.closeWarnModal();
        this.showToast('Avertissement envoyé à la partie signalée.', 'success');
      },
      error: () => { this.warning.set(false); this.showToast('Erreur lors de l\'envoi.', 'error'); },
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
        this.showToast('Signalement rejeté, l\'auteur a reçu un email d\'explication.', 'success');
      },
      error: () => { this.rejecting.set(false); this.showToast('Erreur lors du rejet.', 'error'); },
    });
  }

  tabLabel(s: string): string {
    if (s === 'ALL') return 'Tous';
    return this.STATUS_LABELS[s] ?? s;
  }

  statVal(k: string): number { return this.stats()[k] ?? 0; }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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
}
