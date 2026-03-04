import {
  Component, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

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
  imports: [CommonModule, RouterLink, RouterLinkActive],
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
  selectedContract = signal<Contract | null>(null);
  showModal        = signal(false);
  signing          = signal(false);
  signError        = signal('');
  signSuccess      = signal(false);

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

  constructor(
    private contractService: ContractService,
    private freelancerService: FreelancerService,
    private notificationService: NotificationService,
    public authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
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
  goBack(): void { this.router.navigate(['/freelancer-dashboard']); }

  // ── Open / close modal ────────────────────────────────────────────────────

  openContract(contract: Contract): void {
    this.selectedContract.set(contract);
    this.showModal.set(true);
    this.signError.set('');
    this.signSuccess.set(false);
    this.hasDrawn = false;
    // Init canvas after modal renders
    setTimeout(() => this.initCanvas(), 100);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedContract.set(null);
    this.clearSignature();
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
        // Update in list
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

  downloadPdf(contract: Contract): void {
    const url = contract.signedPdfUrl || contract.pdfUrl;
    if (url) window.open(this.getFileUrl(url), '_blank');
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/auth/login']); }
}
