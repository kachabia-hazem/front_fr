import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ChangeDetectorRef, Component, OnDestroy, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';

import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import { forkJoin } from 'rxjs';
import { ContractService } from '../../core/services/contract.service';
import { FreelancerService } from '../../core/services/freelancer.service';
import { ActiveMissionService } from '../../core/services/active-mission.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { Contract } from '../../core/models/contract.model';
import { Freelancer } from '../../core/models';
@Component({
  selector: 'app-freelancer-contracts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, SafeUrlPipe, TranslateModule],
  templateUrl: './freelancer-contracts.component.html',
  styleUrl: './freelancer-contracts.component.css',
})
export class FreelancerContractsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  freelancer      = signal<Freelancer | null>(null);
  contracts       = signal<Contract[]>([]);
  loading         = signal(true);

  completedContractIds = signal<Set<string>>(new Set());
  isCompleted(contractId: string): boolean { return this.completedContractIds().has(contractId); }
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

  // Selection & delete
  selectionMode     = signal(false);
  selectedIds       = signal<Set<string>>(new Set());
  showDeleteConfirm = signal(false);
  deleting          = signal(false);

  selectedCount = computed(() => this.selectedIds().size);
  allSelected   = computed(() =>
    this.pagedContracts().length > 0 &&
    this.pagedContracts().every(c => this.selectedIds().has(c.id))
  );

  isSelected(id: string): boolean { return this.selectedIds().has(id); }

  toggleSelection(id: string, event: Event): void {
    event.stopPropagation();
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    const all = this.allSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      this.pagedContracts().forEach(c => all ? next.delete(c.id) : next.add(c.id));
      return next;
    });
  }

  enterSelectionMode(): void { this.selectionMode.set(true); }

  exitSelectionMode(): void {
    this.selectionMode.set(false);
    this.selectedIds.set(new Set());
    this.showDeleteConfirm.set(false);
  }

  confirmDeleteSelected(): void { this.showDeleteConfirm.set(true); }

  cancelDeleteConfirm(): void { this.showDeleteConfirm.set(false); }

  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.deleting.set(true);
    let completed = 0;
    ids.forEach(id => {
      this.contractService.deleteContract(id).subscribe({
        next: () => {
          this.contracts.update(list => list.filter(c => c.id !== id));
          completed++;
          if (completed === ids.length) {
            this.deleting.set(false);
            this.exitSelectionMode();
          }
        },
        error: () => {
          completed++;
          if (completed === ids.length) {
            this.deleting.set(false);
            this.exitSelectionMode();
          }
        },
      });
    });
  }

  // Reject modal
  showRejectModal   = signal(false);
  rejectReason      = '';
  rejecting         = signal(false);
  rejectError       = signal('');
  contractToReject  = signal<Contract | null>(null);

  private langSub?: Subscription;

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

  pendingCount  = computed(() => this.contracts().filter(c => c.status === 'PENDING_SIGNATURE').length);
  signedCount   = computed(() => this.contracts().filter(c => c.status === 'SIGNED').length);
  rejectedCount = computed(() => this.contracts().filter(c => c.status === 'REJECTED').length);

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
    private activeMissionService: ActiveMissionService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private location: Location,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.freelancerService.getMyProfile().subscribe({ next: p => this.freelancer.set(p) });
    const targetContractId = this.route.snapshot.queryParamMap.get('contractId');
    forkJoin({
      contracts:      this.contractService.getFreelancerContracts(),
      activeMissions: this.activeMissionService.getFreelancerMissions(),
    }).subscribe({
      next: ({ contracts, activeMissions }) => {
        this.contracts.set(contracts);
        const completedIds = new Set(
          activeMissions
            .filter(m => m.status === 'COMPLETED' && m.contractId)
            .map(m => m.contractId)
        );
        this.completedContractIds.set(completedIds);
        this.loading.set(false);
        if (targetContractId) {
          const target = contracts.find(c => c.id === targetContractId);
          if (target) {
            this.openContract(target);
          }
        }
      },
      error: () => this.loading.set(false),
    });
    this.notificationService.getUnreadCount().subscribe();
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

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

  // ── Reject flow ───────────────────────────────────────────────────────────

  openRejectModal(contract: Contract, event?: Event): void {
    event?.stopPropagation();
    this.contractToReject.set(contract);
    this.rejectReason = '';
    this.rejectError.set('');
    this.showRejectModal.set(true);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.contractToReject.set(null);
    this.rejectReason = '';
    this.rejectError.set('');
  }

  confirmReject(): void {
    const contract = this.contractToReject();
    if (!contract) return;

    this.rejecting.set(true);
    this.rejectError.set('');

    this.contractService.rejectContract(contract.id, this.rejectReason).subscribe({
      next: (updated) => {
        this.rejecting.set(false);
        this.contracts.update(list => list.map(c => c.id === updated.id ? updated : c));
        this.closeRejectModal();
        // If the main detail modal was open for this contract, close it too
        if (this.selectedContract()?.id === contract.id) {
          this.closeModal();
        }
      },
      error: (err) => {
        this.rejecting.set(false);
        this.rejectError.set(err?.error?.message || 'Failed to reject contract. Please try again.');
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
    if (status === 'PENDING_SIGNATURE') return this.translate.instant('freelancer_contracts.status_pending');
    if (status === 'SIGNED') return this.translate.instant('freelancer_contracts.status_signed');
    if (status === 'REJECTED') return this.translate.instant('freelancer_contracts.status_rejected');
    if (status === 'CANCELLED') return this.translate.instant('freelancer_contracts.status_cancelled');
    return status;
  }

  paymentStatusLabel(status: string | null): string {
    if (!status || status === 'UNPAID') return this.translate.instant('freelancer_contracts.pay_unpaid');
    if (status === 'AUTHORIZED') return this.translate.instant('freelancer_contracts.pay_escrow');
    if (status === 'CAPTURED') return this.translate.instant('freelancer_contracts.pay_released');
    if (status === 'FAILED') return this.translate.instant('freelancer_contracts.pay_failed');
    return status;
  }

  paymentBadgeClass(status: string | null): string {
    if (!status || status === 'UNPAID') return 'badge-unpaid';
    if (status === 'AUTHORIZED') return 'badge-authorized';
    if (status === 'CAPTURED') return 'badge-captured';
    if (status === 'FAILED') return 'badge-failed';
    return '';
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
