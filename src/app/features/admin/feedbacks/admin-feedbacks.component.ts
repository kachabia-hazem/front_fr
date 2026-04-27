import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { Feedback } from '../../../core/models/feedback.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-feedbacks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-feedbacks.component.html',
  styleUrls: ['./admin-feedbacks.component.css'],
})
export class AdminFeedbacksComponent implements OnInit {

  feedbacks  = signal<Feedback[]>([]);
  stats      = signal<Record<string, number>>({});
  loading    = signal(true);

  searchQuery  = signal('');
  statusFilter = signal('PENDING');

  selected = signal<Feedback | null>(null);

  rejectTarget = signal<Feedback | null>(null);
  rejectReason = signal('');
  rejecting    = signal(false);

  processing = signal<string | null>(null);

  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  readonly TABS = ['ALL', 'PENDING', 'VALIDATED', 'REJECTED'];

  filteredFeedbacks = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.feedbacks().filter(f => {
      const matchQ = !q || `${f.userName ?? ''} ${f.missionTitle} ${f.comment ?? ''}`.toLowerCase().includes(q);
      const matchS = s === 'ALL' || f.status === s;
      return matchQ && matchS;
    });
  });

  pendingCount = computed(() => this.feedbacks().filter(f => f.status === 'PENDING').length);

  constructor(private feedbackService: FeedbackService) {}

  ngOnInit() { this.load(); }

  private load() {
    this.loading.set(true);
    this.feedbackService.getAllFeedbacks().subscribe({
      next: (data) => { this.feedbacks.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.feedbackService.getStats().subscribe({
      next: (data) => this.stats.set(data),
    });
  }

  select(f: Feedback) {
    this.selected.set(this.selected()?.id === f.id ? null : f);
  }

  closePanel() { this.selected.set(null); }

  approve(f: Feedback, event?: MouseEvent) {
    event?.stopPropagation();
    if (this.processing()) return;
    this.processing.set(f.id);
    this.feedbackService.validateFeedback(f.id).subscribe({
      next: (updated) => {
        this.updateFeedback(updated);
        this.processing.set(null);
        this.showToast('Feedback approuvé et publié sur la page d\'accueil.', 'success');
      },
      error: () => { this.processing.set(null); this.showToast('Erreur lors de l\'approbation.', 'error'); },
    });
  }

  openRejectModal(f: Feedback, event?: MouseEvent) {
    event?.stopPropagation();
    this.rejectTarget.set(f);
    this.rejectReason.set('');
  }

  closeRejectModal() { this.rejectTarget.set(null); this.rejectReason.set(''); }

  confirmReject() {
    const target = this.rejectTarget();
    if (!target || !this.rejectReason().trim()) return;
    this.rejecting.set(true);
    this.feedbackService.rejectFeedback(target.id, this.rejectReason()).subscribe({
      next: (updated) => {
        this.updateFeedback(updated);
        this.rejecting.set(false);
        this.closeRejectModal();
        this.showToast('Feedback rejeté, l\'auteur a été notifié.', 'success');
      },
      error: () => { this.rejecting.set(false); this.showToast('Erreur lors du rejet.', 'error'); },
    });
  }

  delete(f: Feedback, event?: MouseEvent) {
    event?.stopPropagation();
    if (!confirm(`Supprimer définitivement ce feedback ?`)) return;
    this.feedbackService.deleteFeedback(f.id).subscribe({
      next: () => {
        this.feedbacks.update(list => list.filter(x => x.id !== f.id));
        if (this.selected()?.id === f.id) this.closePanel();
        this.showToast('Feedback supprimé.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error'),
    });
  }

  stars(n: number): number[] { return Array.from({ length: 5 }, (_, i) => i + 1); }

  photoUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  initials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  tabLabel(s: string): string {
    const map: Record<string, string> = { ALL: 'All', PENDING: 'Pending', VALIDATED: 'Published', REJECTED: 'Rejected' };
    return map[s] ?? s;
  }

  statVal(k: string): number { return this.stats()[k] ?? 0; }

  private updateFeedback(updated: Feedback) {
    this.feedbacks.update(list => list.map(f => f.id === updated.id ? updated : f));
    if (this.selected()?.id === updated.id) this.selected.set(updated);
    this.stats.update(s => ({ ...s, PENDING: this.feedbacks().filter(f => f.status === 'PENDING').length }));
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
