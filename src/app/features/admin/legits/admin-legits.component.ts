import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LegitService } from '../../../core/services/legit.service';
import { Legit, LegitStatus } from '../../../core/models/legit.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-legits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-legits.component.html',
  styleUrls: ['./admin-legits.component.css'],
})
export class AdminLegitsComponent implements OnInit {

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

  processing = signal<string | null>(null);

  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  readonly TABS = ['ALL', 'EN_ATTENTE', 'EN_COURS', 'RESOLU', 'REJETE'];

  readonly STATUS_LABELS: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    EN_COURS:   'En cours',
    RESOLU:     'Résolu',
    REJETE:     'Rejeté',
  };

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

  constructor(private legitService: LegitService) {}

  ngOnInit() { this.load(); }

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
        this.showToast('Statut mis à jour.', 'success');
      },
      error: () => { this.processing.set(null); this.showToast('Erreur lors de la mise à jour.', 'error'); },
    });
  }

  // ── Email modal ────────────────────────────────────────────────────────────

  openEmailModal(l: Legit, event?: MouseEvent) {
    event?.stopPropagation();
    this.emailTarget.set(l);
    this.emailSubject.set('Concernant votre litige — WorkLink');
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
        this.showToast('Email envoyé et notification créée.', 'success');
      },
      error: () => { this.sending.set(false); this.showToast("Échec de l'envoi.", 'error'); },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  tabLabel(s: string): string {
    if (s === 'ALL') return 'Tous';
    return this.STATUS_LABELS[s] ?? s;
  }

  statVal(k: string): number { return this.stats()[k] ?? 0; }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
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
}
