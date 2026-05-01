import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompanyService } from '../../core/services/company.service';
import { ContractService } from '../../core/services/contract.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Contract } from '../../core/models/contract.model';
import { Company } from '../../core/models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-company-transactions',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './company-transactions.component.html',
  styleUrl: './company-transactions.component.css',
})
export class CompanyTransactionsComponent implements OnInit {
  company          = signal<Company | null>(null);
  contracts        = signal<Contract[]>([]);
  loading          = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  escrowContracts   = computed(() => this.contracts().filter(c => c.paymentStatus === 'AUTHORIZED'));
  capturedContracts = computed(() => this.contracts().filter(c => c.paymentStatus === 'CAPTURED'));
  escrowBalance     = computed(() => this.escrowContracts().reduce((s, c) => s + (c.totalAmount ?? 0), 0));
  releasedBalance   = computed(() => this.capturedContracts().reduce((s, c) => s + (c.totalAmount ?? 0), 0));

  contractsWithPayment = computed(() =>
    this.contracts()
      .filter(c => c.paymentStatus != null)
      .sort((a, b) => {
        const order: Record<string, number> = { AUTHORIZED: 0, CAPTURED: 1, FAILED: 2, REFUNDED: 3, UNPAID: 4 };
        return (order[a.paymentStatus!] ?? 5) - (order[b.paymentStatus!] ?? 5);
      })
  );

  companyName = computed(() => this.company()?.companyName || 'Company');
  companyLogo = computed(() => this.company()?.companyLogo);
  companyInitials = computed(() => {
    const name = this.companyName();
    return name.split(' ').filter(Boolean).map(p => p.charAt(0)).join('').toUpperCase().slice(0, 2) || '?';
  });

  constructor(
    private companyService: CompanyService,
    private contractService: ContractService,
    private notificationService: NotificationService,
    public  authService: AuthService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.translate.setTranslation('en', {
      transactions: {
        company_title:    'Transactions',
        company_subtitle: 'Track your contract payments and freelancer payouts',
        company_no_data:  'No payment transactions yet',
        view_contracts:   'View Contracts',
        escrow:           'In Escrow',
        released:         'Released to Freelancers',
        contracts_count:  '{{n}} contract(s)',
        payments_detail:  'Payment Details',
        paid_on:          'Paid on {{date}}',
        authorized_on:    'Authorized on {{date}}',
        status_escrow:    'In Escrow',
        status_released:  'Released',
        status_failed:    'Failed',
        status_refunded:  'Refunded',
        status_unpaid:    'Unpaid',
      }
    }, true);
    this.translate.setTranslation('fr', {
      transactions: {
        company_title:    'Transactions',
        company_subtitle: 'Suivez vos paiements de contrats et versements aux freelancers',
        company_no_data:  'Aucune transaction de paiement',
        view_contracts:   'Voir les contrats',
        escrow:           'En escrow',
        released:         'Versés aux freelancers',
        contracts_count:  '{{n}} contrat(s)',
        payments_detail:  'Détail des paiements',
        paid_on:          'Payé le {{date}}',
        authorized_on:    'Autorisé le {{date}}',
        status_escrow:    'En escrow',
        status_released:  'Versé',
        status_failed:    'Échoué',
        status_refunded:  'Remboursé',
        status_unpaid:    'Non payé',
      }
    }, true);

    this.companyService.getMyProfile().subscribe({
      next: (p) => { this.company.set(p); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.contractService.getCompanyContracts().subscribe({
      next: (list) => this.contracts.set(list),
    });
    this.notificationService.getUnreadCount().subscribe();
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }

  getFileUrl(path: string | undefined): string {
    if (!path) return '';
    return environment.apiUrl.replace(/\/api$/, '') + path;
  }

  formatTND(amount: number | null): string {
    if (amount == null) return '—';
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    const locale = this.translate.currentLang === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  paymentStatusLabel(status: string | null): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'transactions.status_escrow',
      CAPTURED:   'transactions.status_released',
      FAILED:     'transactions.status_failed',
      REFUNDED:   'transactions.status_refunded',
      UNPAID:     'transactions.status_unpaid',
    };
    return status ? (map[status] ?? status) : '—';
  }

  paymentStatusClass(status: string | null): string {
    const map: Record<string, string> = {
      AUTHORIZED: 'badge-escrow',
      CAPTURED:   'badge-captured',
      FAILED:     'badge-failed',
      REFUNDED:   'badge-refunded',
      UNPAID:     'badge-unpaid',
    };
    return status ? (map[status] ?? 'badge-unpaid') : '';
  }
}
