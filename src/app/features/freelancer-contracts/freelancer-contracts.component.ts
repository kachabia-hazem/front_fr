import {
  Component, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import { ContractService } from '../../core/services/contract.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Contract } from '../../core/models/contract.model';
import { Freelancer } from '../../core/models';
@Component({
  selector: 'app-freelancer-contracts',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SafeUrlPipe],
  templateUrl: './freelancer-contracts.component.html',
  styleUrl: './freelancer-contracts.component.css',
})
export class FreelancerContractsComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  freelancer      = signal<Freelancer | null>(null);
  contracts       = signal<Contract[]>([]);
  loading         = signal(true);
  sidebarCollapsed = signal(false);
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  // Detail / sign modal
  selectedContract  = signal<Contract | null>(null);
  showModal         = signal(false);
  showSignaturePad  = signal(false);
  signing           = signal(false);
  signError         = signal('');
  signSuccess       = signal(false);
  pdfBlobUrl        = signal<string | null>(null);
  pdfLoading        = signal(false);

  // Signature pad state
  private ctx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private hasDrawn = false;

  initials = computed(() => {
    const f = this.freelancer();
    if (!f) return '?';
    return ((f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')).toUpperCase();
  });
  displayName = computed(() => {
    const f = this.freelancer();
    if (!f) return '';
    return `${f.firstName || ''} ${f.lastName || ''}`.trim();
  });
  currentPosition = computed(() => this.freelancer()?.currentPosition || 'Freelancer');

  pendingCount = computed(() => this.contracts().filter(c => c.status === 'PENDING_SIGNATURE').length);
  signedCount  = computed(() => this.contracts().filter(c => c.status === 'SIGNED').length);

  readonly PAGE_SIZE = 7;
  contractPage = signal(0);

  sortedContracts = computed(() =>
    [...this.contracts()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );

  totalContractPages = computed(() => Math.max(1, Math.ceil(this.sortedContracts().length / this.PAGE_SIZE)));
  pagedContracts = computed(() => {
    const start = this.contractPage() * this.PAGE_SIZE;
    return this.sortedContracts().slice(start, start + this.PAGE_SIZE);
  });

  contractPrevPage(): void { this.contractPage.update(p => Math.max(0, p - 1)); }
  contractNextPage(): void { this.contractPage.update(p => Math.min(this.totalContractPages() - 1, p + 1)); }

  constructor(
    private contractService: ContractService,
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({ next: p => this.freelancer.set(p) });
    this.contractService.getFreelancerContracts().subscribe({
      next: list => { this.contracts.set(list); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.notificationService.getUnreadCount().subscribe();
  }

  ngAfterViewInit(): void {}

  toggleSidebar(): void { this.sidebarCollapsed.update(v => !v); }
  goBack(): void { this.router.navigate(['/']); }

  // ── Open / close modal ────────────────────────────────────────────────────

  openContract(contract: Contract): void {
    this.selectedContract.set(contract);
    this.showModal.set(true);
    this.showSignaturePad.set(false);
    this.signError.set('');
    this.signSuccess.set(false);
    this.hasDrawn = false;
    this.pdfBlobUrl.set(null);
    // Load signed PDF if freelancer already signed, otherwise load the contract PDF (has company auto-sig)
    const pdfPath = contract.signedAt ? (contract.signedPdfUrl || contract.pdfUrl) : contract.pdfUrl;
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

  startSigning(): void {
    this.showSignaturePad.set(true);
    setTimeout(() => this.initCanvas(), 100);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedContract.set(null);
    this.showSignaturePad.set(false);
    this.clearSignature();
    const blob = this.pdfBlobUrl();
    if (blob) { URL.revokeObjectURL(blob); this.pdfBlobUrl.set(null); }
  }

  // ── Signature pad ─────────────────────────────────────────────────────────

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
    const rect = (this.canvasRef.nativeElement).getBoundingClientRect();
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

  clearSignature(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas && this.ctx) {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.hasDrawn = false;
    this.signError.set('');
  }

  // ── Submit signature ──────────────────────────────────────────────────────

  submitSignature(): void {
    if (!this.hasDrawn) {
      this.signError.set('Please draw your signature before submitting.');
      return;
    }
    const contract = this.selectedContract();
    if (!contract) return;

    const canvas = this.canvasRef.nativeElement;
    const signatureBase64 = canvas.toDataURL('image/png');

    this.signing.set(true);
    this.signError.set('');

    this.contractService.signContract(contract.id, signatureBase64).subscribe({
      next: (updated) => {
        this.signing.set(false);
        this.signSuccess.set(true);
        this.showSignaturePad.set(false);
        this.contracts.update(list => list.map(c => c.id === updated.id ? updated : c));
        this.selectedContract.set(updated);
      },
      error: (err) => {
        this.signing.set(false);
        this.signError.set(err?.error?.message || 'Failed to sign contract. Please try again.');
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getFileUrl(path: string | null | undefined): string {
    return this.contractService.getFileUrl(path);
  }

  get profilePicture(): string | undefined {
    return this.freelancer()?.profilePicture;
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusLabel(status: string): string {
    if (status === 'PENDING_SIGNATURE') return 'Pending Signature';
    if (status === 'SIGNED') return 'Signed';
    return status;
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

  logout(): void { this.authService.logout(); this.router.navigate(['/auth/login']); }
}
