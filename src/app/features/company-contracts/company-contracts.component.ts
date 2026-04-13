import {
  Component, OnInit, AfterViewInit, signal, computed, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
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
  imports: [CommonModule, RouterLink, RouterLinkActive, SafeUrlPipe],
  templateUrl: './company-contracts.component.html',
  styleUrl: './company-contracts.component.css',
})
export class CompanyContractsComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  company          = signal<Company | null>(null);
  contracts        = signal<Contract[]>([]);
  loading          = signal(true);
  sidebarCollapsed = signal(false);
  unreadCount      = computed(() => this.notificationService.unreadCount());

  // Unified modal
  showModal        = signal(false);
  selectedContract = signal<Contract | null>(null);
  showSignaturePad = signal(false);
  signing          = signal(false);
  signError        = signal('');
  signSuccess      = signal(false);
  pdfBlobUrl       = signal<string | null>(null);
  pdfLoading       = signal(false);

  // Dropdown menu
  openMenuId = signal<string | null>(null);

  // Rejection reason modal
  showRejectionModal   = signal(false);
  rejectionContract    = signal<Contract | null>(null);

  toggleMenu(id: string): void {
    this.openMenuId.update(cur => cur === id ? null : id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // Toast
  toastVisible = signal(false);
  private toastTimer: any;

  // Filters
  statusFilter = signal<string>('ALL');
  searchQuery  = signal('');
  sortDir      = signal<'desc' | 'asc'>('desc');

  // Canvas state
  private ctx: CanvasRenderingContext2D | null = null;
  private drawing  = false;
  private hasDrawn = false;

  companyName = computed(() => this.company()?.companyName || 'Company');
  companyLogo = computed(() => this.company()?.companyLogo);
  companyInitials = computed(() => {
    const n = this.companyName();
    return n.split(' ').map((w: string) => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  });

  pendingCount  = computed(() => this.contracts().filter(c => c.status === 'PENDING_SIGNATURE').length);
  signedCount   = computed(() => this.contracts().filter(c => c.status === 'SIGNED').length);
  rejectedCount = computed(() => this.contracts().filter(c => c.status === 'REJECTED').length);

  readonly PAGE_SIZE = 7;
  readonly Math = Math;
  contractPage = signal(0);

  private responseDate(c: Contract): number {
    const d = c.signedAt || c.rejectedAt;
    return d ? new Date(d).getTime() : 0;
  }

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
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return this.sortDir() === 'desc' ? bTime - aTime : aTime - bTime;
    });
  });

  totalContractPages = computed(() => Math.max(1, Math.ceil(this.filteredContracts().length / this.PAGE_SIZE)));
  pagedContracts = computed(() => {
    const start = this.contractPage() * this.PAGE_SIZE;
    return this.filteredContracts().slice(start, start + this.PAGE_SIZE);
  });

  contractPrevPage(): void { this.contractPage.update(p => Math.max(0, p - 1)); }
  contractNextPage(): void { this.contractPage.update(p => Math.min(this.totalContractPages() - 1, p + 1)); }

  constructor(
    private contractService: ContractService,
    private companyService: CompanyService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.companyService.getMyProfile().subscribe({ next: p => this.company.set(p) });
    this.contractService.getCompanyContracts().subscribe({
      next: list => { this.contracts.set(list); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.notificationService.getUnreadCount().subscribe();
  }

  ngAfterViewInit(): void {}

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }
  goBack(): void { this.router.navigate(['/']); }

  // ── Modal ──────────────────────────────────────────────────────────────────

  openModal(contract: Contract): void {
    this.selectedContract.set(contract);
    this.showModal.set(true);
    this.showSignaturePad.set(false);
    this.signError.set('');
    this.signSuccess.set(false);
    this.hasDrawn = false;
    this.pdfBlobUrl.set(null);
    const pdfPath = contract.pdfUrl;
    if (pdfPath) {
      this.pdfLoading.set(true);
      fetch(this.getFileUrl(pdfPath))
        .then(res => res.blob())
        .then(blob => {
          this.pdfBlobUrl.set(URL.createObjectURL(blob) + '#toolbar=0&navpanes=0&scrollbar=0');
          this.pdfLoading.set(false);
        })
        .catch(() => this.pdfLoading.set(false));
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedContract.set(null);
    this.showSignaturePad.set(false);
    this.clearCanvas();
    const blob = this.pdfBlobUrl();
    if (blob) { URL.revokeObjectURL(blob.split('#')[0]); this.pdfBlobUrl.set(null); }
  }

  startSigning(): void {
    this.showSignaturePad.set(true);
    setTimeout(() => this.initCanvas(), 100);
  }

  // ── Canvas ─────────────────────────────────────────────────────────────────

  private initCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    canvas.addEventListener('mousedown',  this.startDraw.bind(this));
    canvas.addEventListener('mousemove',  this.draw.bind(this));
    canvas.addEventListener('mouseup',    this.endDraw.bind(this));
    canvas.addEventListener('mouseleave', this.endDraw.bind(this));
    canvas.addEventListener('touchstart', this.touchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove',  this.touchMove.bind(this),  { passive: false });
    canvas.addEventListener('touchend',   this.endDraw.bind(this));
  }

  private getPos(e: MouseEvent): { x: number; y: number } {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private startDraw(e: MouseEvent): void {
    this.drawing = true;
    const { x, y } = this.getPos(e);
    this.ctx?.beginPath();
    this.ctx?.moveTo(x, y);
  }

  private draw(e: MouseEvent): void {
    if (!this.drawing || !this.ctx) return;
    const { x, y } = this.getPos(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasDrawn = true;
  }

  private endDraw(): void { this.drawing = false; }

  private touchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.drawing = true;
    this.ctx?.beginPath();
    this.ctx?.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  private touchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.drawing || !this.ctx) return;
    const touch = e.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.ctx.stroke();
    this.hasDrawn = true;
  }

  clearCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && this.ctx) this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasDrawn = false;
    this.signError.set('');
  }

  // ── Submit signature ───────────────────────────────────────────────────────

  submitSignature(): void {
    if (!this.hasDrawn) {
      this.signError.set('Please draw your signature before submitting.');
      return;
    }
    const contract = this.selectedContract();
    if (!contract) return;

    const signatureBase64 = this.canvasRef.nativeElement.toDataURL('image/png');
    this.signing.set(true);
    this.signError.set('');

    this.contractService.signContractAsCompany(contract.id, signatureBase64).subscribe({
      next: (updated) => {
        this.signing.set(false);
        this.signSuccess.set(true);
        this.showSignaturePad.set(false);
        this.contracts.update(list => list.map(c => c.id === updated.id ? updated : c));
        this.selectedContract.set(updated);
        this.showToast();
      },
      error: (err) => {
        this.signing.set(false);
        this.signError.set(err?.error?.message || 'Failed to sign contract. Please try again.');
      },
    });
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  private showToast(): void {
    clearTimeout(this.toastTimer);
    this.toastVisible.set(true);
    this.toastTimer = setTimeout(() => this.toastVisible.set(false), 3500);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  setStatusFilter(s: string): void { this.statusFilter.set(s); this.contractPage.set(0); }
  onSearch(e: Event): void { this.searchQuery.set((e.target as HTMLInputElement).value); this.contractPage.set(0); }

  getFileUrl(path: string | null | undefined): string {
    return this.contractService.getFileUrl(path);
  }

  viewPdf(contract: Contract): void {
    const url = contract.signedPdfUrl || contract.pdfUrl;
    if (url) window.open(this.getFileUrl(url), '_blank');
  }

  downloadPdf(contract: Contract): void {
    const url = contract.signedPdfUrl || contract.pdfUrl;
    if (!url) return;
    fetch(this.getFileUrl(url))
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `contract-${contract.missionTitle.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      });
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusLabel(status: string): string {
    if (status === 'PENDING_SIGNATURE') return 'Pending Signature';
    if (status === 'SIGNED') return 'Signed';
    if (status === 'REJECTED') return 'Rejected';
    return status;
  }

  getResponseDate(contract: Contract): string {
    const d = contract.signedAt || contract.rejectedAt;
    return d ? this.formatDate(d) : '—';
  }

  openRejectionModal(contract: Contract): void {
    this.rejectionContract.set(contract);
    this.showRejectionModal.set(true);
  }

  closeRejectionModal(): void {
    this.showRejectionModal.set(false);
    this.rejectionContract.set(null);
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/auth/login']); }
}
