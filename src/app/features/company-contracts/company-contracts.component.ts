import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import { ContractService } from '../../core/services/contract.service';
import { CompanyService } from '../../core/services/company.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Contract } from '../../core/models/contract.model';
import { Company } from '../../core/models/user.model';
@Component({
  selector: 'app-company-contracts',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './company-contracts.component.html',
  styleUrl: './company-contracts.component.css',
})
export class CompanyContractsComponent implements OnInit {
  company      = signal<Company | null>(null);
  contracts    = signal<Contract[]>([]);
  loading      = signal(true);
  sidebarCollapsed = signal(false);
  unreadCount  = computed(() => this.notificationService.unreadCount());

  // Modal
  selectedContract = signal<Contract | null>(null);
  showModal        = signal(false);

  // Filters
  statusFilter = signal<string>('ALL');
  searchQuery  = signal('');
  sortDir      = signal<'desc' | 'asc'>('desc');

  companyName = computed(() => this.company()?.companyName || 'Company');
  companyLogo = computed(() => this.company()?.companyLogo);
  companyInitials = computed(() => {
    const n = this.companyName();
    return n.split(' ').map((w: string) => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  });

  pendingCount = computed(() => this.contracts().filter(c => c.status === 'PENDING_SIGNATURE').length);
  signedCount  = computed(() => this.contracts().filter(c => c.status === 'SIGNED').length);

  filteredContracts = computed(() => {
    let list = this.contracts();
    const q = this.searchQuery().toLowerCase().trim();
    if (q) list = list.filter(c =>
      c.freelancerName.toLowerCase().includes(q) ||
      c.missionTitle.toLowerCase().includes(q)
    );
    if (this.statusFilter() !== 'ALL') {
      list = list.filter(c => c.status === this.statusFilter());
    }
    return list.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return this.sortDir() === 'desc' ? diff : -diff;
    });
  });

  constructor(
    private contractService: ContractService,
    private companyService: CompanyService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.companyService.getMyProfile().subscribe({ next: p => this.company.set(p) });
    this.contractService.getCompanyContracts().subscribe({
      next: list => { this.contracts.set(list); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.notificationService.getUnreadCount().subscribe();
  }

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }
  goBack(): void { this.router.navigate(['/company-dashboard']); }

  openContract(contract: Contract): void {
    this.selectedContract.set(contract);
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); this.selectedContract.set(null); }

  setStatusFilter(s: string): void { this.statusFilter.set(s); }
  onSearch(e: Event): void { this.searchQuery.set((e.target as HTMLInputElement).value); }

  getFileUrl(path: string | null | undefined): string {
    return this.contractService.getFileUrl(path);
  }

  downloadPdf(contract: Contract): void {
    const url = contract.signedPdfUrl || contract.pdfUrl;
    if (url) window.open(this.getFileUrl(url), '_blank');
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusLabel(status: string): string {
    if (status === 'PENDING_SIGNATURE') return 'Pending Signature';
    if (status === 'SIGNED') return 'Signed';
    return status;
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/auth/login']); }
}
