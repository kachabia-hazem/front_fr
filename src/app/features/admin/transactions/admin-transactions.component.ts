import { Component, OnInit, signal, computed, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  AdminService,
  AdminContractPayment,
  AdminPointTransaction,
} from '../../../core/services/admin.service';
import { Subscription } from 'rxjs';

type TransactionTab = 'contracts' | 'points';
type PaymentStatusFilter = 'ALL' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
type PointTypeFilter = 'ALL' | 'PURCHASE_PACK' | 'SUBSCRIBE_PLAN' | 'APPLICATION' | 'AI_MATCHING';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './admin-transactions.component.html',
  styleUrls: ['./admin-transactions.component.css'],
})
export class AdminTransactionsComponent implements OnInit, OnDestroy {

  activeTab = signal<TransactionTab>('contracts');

  contractPayments = signal<AdminContractPayment[]>([]);
  contractsLoading = signal(false);
  contractSearch = signal('');
  contractStatusFilter = signal<PaymentStatusFilter>('ALL');

  pointTransactions = signal<AdminPointTransaction[]>([]);
  pointsLoading = signal(false);
  pointSearch = signal('');
  pointTypeFilter = signal<PointTypeFilter>('ALL');

  selectedContract = signal<AdminContractPayment | null>(null);
  selectedPoint = signal<AdminPointTransaction | null>(null);

  readonly CONTRACT_STATUS_TABS: PaymentStatusFilter[] = ['ALL', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'];
  readonly POINT_TYPE_TABS: PointTypeFilter[] = ['ALL', 'PURCHASE_PACK', 'SUBSCRIBE_PLAN', 'APPLICATION', 'AI_MATCHING'];

  filteredContracts = computed(() => {
    const q = this.contractSearch().toLowerCase();
    const s = this.contractStatusFilter();
    return this.contractPayments().filter(c => {
      const matchQ = !q || `${c.missionTitle} ${c.freelancerName} ${c.freelancerEmail} ${c.companyName} ${c.companyEmail}`.toLowerCase().includes(q);
      const matchS = s === 'ALL' || c.paymentStatus === s;
      return matchQ && matchS;
    });
  });

  filteredPoints = computed(() => {
    const q = this.pointSearch().toLowerCase();
    const t = this.pointTypeFilter();
    return this.pointTransactions().filter(p => {
      const matchQ = !q || `${p.userName} ${p.userEmail} ${p.description}`.toLowerCase().includes(q);
      const matchT = t === 'ALL' || p.type === t;
      return matchQ && matchT;
    });
  });

  totalPointsRevenue = computed(() =>
    this.pointTransactions()
      .filter(p => p.amount > 0)
      .reduce((sum, p) => sum + p.amount, 0)
  );

  totalPointsGranted = computed(() =>
    this.pointTransactions()
      .filter(p => p.points > 0)
      .reduce((sum, p) => sum + p.points, 0)
  );

  private langSub?: Subscription;

  constructor(
    private adminService: AdminService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.loadContracts();
  }

  setTab(tab: TransactionTab) {
    this.activeTab.set(tab);
    this.selectedContract.set(null);
    this.selectedPoint.set(null);
    if (tab === 'contracts' && this.contractPayments().length === 0) this.loadContracts();
    if (tab === 'points' && this.pointTransactions().length === 0) this.loadPoints();
  }

  private loadContracts() {
    this.contractsLoading.set(true);
    this.adminService.getContractPayments().subscribe({
      next: (data) => { this.contractPayments.set(data); this.contractsLoading.set(false); },
      error: () => this.contractsLoading.set(false),
    });
  }

  private loadPoints() {
    this.pointsLoading.set(true);
    this.adminService.getPointTransactions().subscribe({
      next: (data) => { this.pointTransactions.set(data); this.pointsLoading.set(false); },
      error: () => this.pointsLoading.set(false),
    });
  }

  refreshContracts() { this.loadContracts(); }
  refreshPoints() { this.loadPoints(); }

  selectContract(c: AdminContractPayment) {
    this.selectedContract.set(this.selectedContract()?.id === c.id ? null : c);
  }

  selectPoint(p: AdminPointTransaction) {
    this.selectedPoint.set(this.selectedPoint()?.id === p.id ? null : p);
  }

  formatTND(v: number | null | undefined): string {
    if (v == null) return '—';
    return v.toFixed(3).replace('.', ',') + ' DT';
  }

  paymentStatusLabel(s: string): string {
    const map: Record<string, string> = {
      ALL:        'admin_transactions.filter_all',
      AUTHORIZED: 'admin_transactions.status_authorized',
      CAPTURED:   'admin_transactions.status_captured',
      FAILED:     'admin_transactions.status_failed',
      REFUNDED:   'admin_transactions.status_refunded',
      UNPAID:     'admin_transactions.status_unpaid',
    };
    return map[s] ? this.translate.instant(map[s]) : s;
  }

  paymentStatusClass(s: string): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'badge-escrow',
      CAPTURED:   'badge-captured',
      FAILED:     'badge-failed',
      REFUNDED:   'badge-refunded',
      UNPAID:     'badge-unpaid',
    };
    return map[s] ?? 'badge-unpaid';
  }

  pointTypeLabel(t: string): string {
    const map: Record<string, string> = {
      ALL:            'admin_transactions.filter_all',
      PURCHASE_PACK:  'admin_transactions.type_pack',
      SUBSCRIBE_PLAN: 'admin_transactions.type_sub',
      APPLICATION:    'admin_transactions.type_app',
      AI_MATCHING:    'admin_transactions.type_ai',
    };
    return map[t] ? this.translate.instant(map[t]) : t;
  }

  pointTypeClass(t: string): string {
    const map: Record<string, string> = {
      PURCHASE_PACK:  'type-pack',
      SUBSCRIBE_PLAN: 'type-sub',
      APPLICATION:    'type-app',
      AI_MATCHING:    'type-ai',
    };
    return map[t] ?? 'type-app';
  }

  initials(name: string): string {
    return name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
