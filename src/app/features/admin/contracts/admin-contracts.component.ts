import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContractService } from '../../../core/services/contract.service';
import { Contract } from '../../../core/models/contract.model';

@Component({
  selector: 'app-admin-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-contracts.component.html',
  styleUrls: ['./admin-contracts.component.css'],
})
export class AdminContractsComponent implements OnInit {

  contracts = signal<Contract[]>([]);
  stats = signal<Record<string, number>>({});
  loading = signal(true);

  searchQuery = signal('');
  statusFilter = signal('ALL');

  selectedContract = signal<Contract | null>(null);

  cancelTarget = signal<Contract | null>(null);
  cancelReason = signal('');
  cancelling = signal(false);

  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

  readonly STATUS_TABS = ['ALL', 'PENDING_SIGNATURE', 'SIGNED', 'FINISHED', 'CANCELLED', 'REJECTED'];

  filteredContracts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    return this.contracts().filter(c => {
      const matchQ = !q || `${c.missionTitle} ${c.freelancerName} ${c.companyName}`.toLowerCase().includes(q);
      const matchS = s === 'ALL' || c.status === s;
      return matchQ && matchS;
    });
  });

  constructor(private contractService: ContractService) {}

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.contractService.adminGetAllContracts().subscribe({
      next: (data) => { this.contracts.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.contractService.adminGetContractStats().subscribe({
      next: (data) => this.stats.set(data),
    });
  }

  selectContract(c: Contract) {
    this.selectedContract.set(this.selectedContract()?.id === c.id ? null : c);
  }

  closePanel() {
    this.selectedContract.set(null);
  }

  openCancelModal(c: Contract, event: MouseEvent) {
    event.stopPropagation();
    this.cancelTarget.set(c);
    this.cancelReason.set('');
  }

  closeCancelModal() {
    this.cancelTarget.set(null);
    this.cancelReason.set('');
  }

  confirmCancel() {
    const target = this.cancelTarget();
    if (!target || !this.cancelReason().trim()) return;
    this.cancelling.set(true);
    this.contractService.adminCancelContract(target.id, this.cancelReason()).subscribe({
      next: (updated) => {
        this.contracts.update(list => list.map(c => c.id === updated.id ? updated : c));
        if (this.selectedContract()?.id === updated.id) this.selectedContract.set(updated);
        this.cancelling.set(false);
        this.closeCancelModal();
        this.showToast('Contract cancelled and parties notified.', 'success');
      },
      error: () => {
        this.cancelling.set(false);
        this.showToast('Failed to cancel contract.', 'error');
      },
    });
  }

  openPdf(url: string | null) {
    if (!url) return;
    window.open(this.contractService.getFileUrl(url), '_blank');
  }

  canCancel(c: Contract): boolean {
    return c.status === 'PENDING_SIGNATURE' || c.status === 'SIGNED';
  }

  tabLabel(s: string): string {
    const map: Record<string, string> = {
      ALL: 'All', PENDING_SIGNATURE: 'Pending', SIGNED: 'Signed',
      FINISHED: 'Finished', CANCELLED: 'Cancelled', REJECTED: 'Rejected',
    };
    return map[s] ?? s;
  }

  paymentLabel(status: string | undefined | null): string {
    if (!status || status === 'UNPAID') return 'Non payé';
    const map: Record<string, string> = {
      AUTHORIZED: 'En escrow', CAPTURED: 'Libéré',
      FAILED: 'Échoué', REFUNDED: 'Remboursé',
    };
    return map[status] ?? status;
  }

  paymentClass(status: string | undefined | null): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'pay-escrow', CAPTURED: 'pay-captured',
      FAILED: 'pay-failed',    REFUNDED: 'pay-refunded',
    };
    return status ? (map[status] ?? 'pay-unpaid') : 'pay-unpaid';
  }

  formatTND(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toFixed(3).replace('.', ',') + ' DT';
  }

  getTimeline(c: Contract): { date: string; label: string; icon: 'create' | 'sign' | 'finish' | 'reject' | 'cancel' }[] {
    const events: { date: string; label: string; icon: 'create' | 'sign' | 'finish' | 'reject' | 'cancel' }[] = [];
    if (c.createdAt)       events.push({ date: c.createdAt,       label: 'Contract created & sent to freelancer', icon: 'create' });
    if (c.companySignedAt) events.push({ date: c.companySignedAt, label: 'Company signed',                        icon: 'sign'   });
    if (c.signedAt)        events.push({ date: c.signedAt,        label: 'Freelancer signed — mission started',   icon: 'sign'   });
    if (c.finishedAt)      events.push({ date: c.finishedAt,      label: 'Mission validated — contract finished', icon: 'finish' });
    if (c.rejectedAt)      events.push({ date: c.rejectedAt,      label: `Rejected by freelancer${c.rejectionReason ? ': ' + c.rejectionReason : ''}`, icon: 'reject' });
    if (c.cancelledAt)     events.push({ date: c.cancelledAt,     label: `Cancelled by admin${c.cancellationReason ? ': ' + c.cancellationReason : ''}`, icon: 'cancel' });
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  statVal(key: string): number {
    return this.stats()[key] ?? 0;
  }
}
