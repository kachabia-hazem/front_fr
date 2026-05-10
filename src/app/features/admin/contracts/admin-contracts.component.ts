import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ContractService } from '../../../core/services/contract.service';
import { AdminService } from '../../../core/services/admin.service';
import { Contract } from '../../../core/models/contract.model';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-contracts.component.html',
  styleUrls: ['./admin-contracts.component.css'],
})
export class AdminContractsComponent implements OnInit, OnDestroy{

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
  feePercent = signal(7);

  private langSub?: Subscription;

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

  constructor(
    private contractService: ContractService,
    private adminService: AdminService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.load();
    this.adminService.getSettings().subscribe({
      next: (s) => this.feePercent.set(s.platformFeePercent),
    });
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
    const isSame = this.selectedContract()?.id === c.id;
    this.selectedContract.set(isSame ? null : c);
  }

  closePanel() { this.selectedContract.set(null); }

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
        this.showToast(this.translate.instant('admin_contracts.toast_cancelled'), 'success');
      },
      error: () => {
        this.cancelling.set(false);
        this.showToast(this.translate.instant('admin_contracts.toast_cancel_err'), 'error');
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
    const keyMap: Record<string, string> = {
      ALL: 'tab_all', PENDING_SIGNATURE: 'tab_pending',
      SIGNED: 'tab_signed', FINISHED: 'tab_finished',
      CANCELLED: 'tab_cancelled', REJECTED: 'tab_rejected',
    };
    return this.translate.instant('admin_contracts.' + (keyMap[s] ?? s.toLowerCase()));
  }

  paymentLabel(status: string | undefined | null): string {
    if (!status || status === 'UNPAID') return this.translate.instant('admin_contracts.pay_unpaid');
    const keyMap: Record<string, string> = {
      AUTHORIZED: 'pay_escrow', CAPTURED: 'pay_captured',
      FAILED: 'pay_failed', REFUNDED: 'pay_refunded',
    };
    const key = keyMap[status];
    return key ? this.translate.instant('admin_contracts.' + key) : status;
  }

  paymentClass(status: string | undefined | null): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'pay-escrow', CAPTURED: 'pay-captured',
      FAILED: 'pay-failed', REFUNDED: 'pay-refunded',
    };
    return status ? (map[status] ?? 'pay-unpaid') : 'pay-unpaid';
  }

  netPercent(): number { return 100 - this.feePercent(); }

  formatTND(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toFixed(3).replace('.', ',') + ' DT';
  }

  getTimeline(c: Contract): { date: string; label: string; icon: 'create' | 'sign' | 'finish' | 'reject' | 'cancel' }[] {
    const t = this.translate;
    const events: { date: string; label: string; icon: 'create' | 'sign' | 'finish' | 'reject' | 'cancel' }[] = [];
    if (c.createdAt)       events.push({ date: c.createdAt,       label: t.instant('admin_contracts.tl_created'),          icon: 'create' });
    if (c.companySignedAt) events.push({ date: c.companySignedAt, label: t.instant('admin_contracts.tl_company_signed'),    icon: 'sign'   });
    if (c.signedAt)        events.push({ date: c.signedAt,        label: t.instant('admin_contracts.tl_freelancer_signed'), icon: 'sign'   });
    if (c.finishedAt)      events.push({ date: c.finishedAt,      label: t.instant('admin_contracts.tl_finished'),          icon: 'finish' });
    if (c.rejectedAt)      events.push({ date: c.rejectedAt,      label: t.instant('admin_contracts.tl_rejected') + (c.rejectionReason ? ': ' + c.rejectionReason : ''),    icon: 'reject' });
    if (c.cancelledAt)     events.push({ date: c.cancelledAt,     label: t.instant('admin_contracts.tl_cancelled') + (c.cancellationReason ? ': ' + c.cancellationReason : ''), icon: 'cancel' });
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private showToast(msg: string, type: 'success' | 'error') {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }

  statVal(key: string): number { return this.stats()[key] ?? 0; }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
