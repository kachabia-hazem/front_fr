import { Component, OnInit, OnDestroy, HostListener, signal, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService, AppLanguage } from '../../../core/services/language.service';
import { FreelancerService } from '../../../core/services/freelancer.service';
import { CompanyService } from '../../../core/services/company.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ChatService } from '../../../core/services/chat.service';
import { OffersService, PointPack, SubscriptionPlan, BalanceResponse, CompanySubscriptionResponse } from '../../../core/services/offers.service';
import { Freelancer, Company } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private balanceSub?: Subscription;
  freelancer = signal<Freelancer | null>(null);
  company    = signal<Company | null>(null);
  showDropdown = false;
  showMobileMenu = false;
  unreadNotifCount = computed(() => this.notificationService.unreadCount());

  // ── Points & offers modal ─────────────────────────────────────────────────
  pointsBalance   = signal(0);
  showOffersModal = signal(false);
  offersLoading   = signal(false);
  catalogPacks    = signal<PointPack[]>([]);
  catalogSubs     = signal<SubscriptionPlan[]>([]);
  currentSubPlanId = signal<string | null>(null);

  // purchase confirmation
  confirmPack = signal<PointPack | null>(null);
  confirmSub  = signal<SubscriptionPlan | null>(null);
  purchasing  = signal(false);
  offerToast  = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // ── Profile completion ────────────────────────────────────────────────────
  get profileCompletion(): number {
    const f = this.freelancer();
    const c = this.company();
    if (f) return this.calcFreelancerCompletion(f);
    if (c) return this.calcCompanyCompletion(c);
    return 0;
  }
  get isProfileComplete(): boolean { return this.profileCompletion >= 100; }

  private calcFreelancerCompletion(f: Freelancer): number {
    const fields = [
      { value: f.firstName, weight: 10 }, { value: f.lastName, weight: 10 },
      { value: f.gender, weight: 5 },      { value: f.dateOfBirth, weight: 5 },
      { value: f.phoneNumber, weight: 10 },{ value: f.profileTypes?.length, weight: 10 },
      { value: f.tjm, weight: 5 },         { value: f.languages?.length, weight: 5 },
      { value: f.profilePicture, weight: 10 }, { value: f.bio, weight: 10 },
      { value: f.skills?.length, weight: 10 }, { value: f.currentPosition, weight: 5 },
      { value: f.location, weight: 5 },
    ];
    let done = 0, total = 0;
    for (const field of fields) { total += field.weight; if (field.value) done += field.weight; }
    return Math.round((done / total) * 100);
  }

  private calcCompanyCompletion(c: Company): number {
    const fields = [
      { value: c.companyName, weight: 15 }, { value: c.address, weight: 10 },
      { value: c.legalForm, weight: 10 },   { value: c.tradeRegister, weight: 10 },
      { value: c.foundationDate, weight: 5 },{ value: c.businessSector, weight: 10 },
      { value: c.managerName, weight: 10 },  { value: c.managerEmail, weight: 5 },
      { value: c.managerPosition, weight: 5 },{ value: c.managerPhoneNumber, weight: 5 },
      { value: c.companyLogo, weight: 10 },  { value: c.description, weight: 5 },
    ];
    let done = 0, total = 0;
    for (const field of fields) { total += field.weight; if (field.value) done += field.weight; }
    return Math.round((done / total) * 100);
  }

  get progressCircumference(): number { return 2 * Math.PI * 22; }
  get progressOffset(): number {
    return this.progressCircumference * (1 - this.profileCompletion / 100);
  }

  private router = inject(Router);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public languageService: LanguageService,
    private freelancerService: FreelancerService,
    private companyService: CompanyService,
    private notificationService: NotificationService,
    private chatService: ChatService,
    private offersService: OffersService,
  ) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.showMobileMenu = false;
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) return;
    const role = this.authService.currentUser()?.role;

    if (role === 'FREELANCER') {
      this.freelancerService.getMyProfile().subscribe({ next: (p) => {
        this.freelancer.set(p);
        this.pointsBalance.set(p.pointsBalance ?? 0);
      }});
      this.notificationService.getUnreadCount().subscribe();
      this.chatService.getConversations().subscribe({ error: () => {} });
    } else if (role === 'COMPANY') {
      this.companyService.getMyProfile().subscribe({ next: (c) => {
        this.company.set(c);
        this.pointsBalance.set(c.pointsBalance ?? 0);
        this.currentSubPlanId.set(c.subscriptionPlanId ?? null);
      }});
      this.notificationService.getUnreadCount().subscribe();
      this.chatService.getConversations().subscribe({ error: () => {} });
    }

    this.balanceSub = this.offersService.balanceDecremented$.subscribe((amount) => {
      this.pointsBalance.update(v => Math.max(0, v - amount));
    });
  }

  ngOnDestroy(): void {
    this.balanceSub?.unsubscribe();
  }

  // ── Offers modal ──────────────────────────────────────────────────────────

  openOffersModal(event: Event): void {
    event.stopPropagation();
    this.showDropdown = false;
    if (this.isFreelancer && this.catalogPacks().length === 0) {
      this.offersLoading.set(true);
      this.offersService.getCatalogPacks().subscribe({
        next: (p) => { this.catalogPacks.set(p); this.offersLoading.set(false); },
        error: () => this.offersLoading.set(false),
      });
    }
    if (this.isCompany && this.catalogSubs().length === 0) {
      this.offersLoading.set(true);
      this.offersService.getCatalogSubscriptions().subscribe({
        next: (s) => { this.catalogSubs.set(s); this.offersLoading.set(false); },
        error: () => this.offersLoading.set(false),
      });
    }
    this.showOffersModal.set(true);
  }

  closeOffersModal(): void {
    this.showOffersModal.set(false);
    this.confirmPack.set(null);
    this.confirmSub.set(null);
  }

  askConfirmPack(pack: PointPack): void { this.confirmPack.set(pack); }
  askConfirmSub(sub: SubscriptionPlan): void  { this.confirmSub.set(sub);  }

  doPurchasePack(): void {
    const pack = this.confirmPack();
    if (!pack) return;
    this.purchasing.set(true);
    this.offersService.purchasePack(pack.id).subscribe({
      next: (b) => {
        this.pointsBalance.set(b.pointsBalance);
        this.confirmPack.set(null);
        this.purchasing.set(false);
        this.showToast(`+${pack.points} pts crédités !`, 'success');
      },
      error: () => { this.purchasing.set(false); this.showToast('Erreur lors de l\'achat', 'error'); },
    });
  }

  doSubscribe(): void {
    const sub = this.confirmSub();
    if (!sub) return;
    this.purchasing.set(true);
    this.offersService.subscribeToplan(sub.id).subscribe({
      next: (s) => {
        this.pointsBalance.set(s.pointsBalance);
        this.currentSubPlanId.set(sub.id);
        this.confirmSub.set(null);
        this.purchasing.set(false);
        this.showToast(`Abonnement ${sub.name} activé !`, 'success');
      },
      error: () => { this.purchasing.set(false); this.showToast('Erreur abonnement', 'error'); },
    });
  }

  isCurrentSub(planId: string): boolean {
    return this.currentSubPlanId() === planId;
  }

  isPopularSub(sub: SubscriptionPlan): boolean {
    return (sub.name || '').toLowerCase().includes('premium');
  }

  private showToast(text: string, type: 'success' | 'error'): void {
    this.offerToast.set({ text, type });
    setTimeout(() => this.offerToast.set(null), 3500);
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get initials(): string {
    const f = this.freelancer();
    const c = this.company();
    if (f) return ((f.firstName?.charAt(0) || '') + (f.lastName?.charAt(0) || '')).toUpperCase();
    if (c?.companyName) return c.companyName.charAt(0).toUpperCase();
    return '?';
  }

  get displayName(): string {
    const f = this.freelancer();
    const c = this.company();
    if (f) return `${f.firstName || ''} ${f.lastName || ''}`.trim();
    if (c) return c.companyName || '';
    return '';
  }

  get displayEmail(): string {
    return this.freelancer()?.email || this.company()?.email || this.authService.currentUser()?.email || '';
  }

  get profilePicture(): string | undefined {
    return this.freelancer()?.profilePicture || this.company()?.companyLogo;
  }

  get isFreelancer(): boolean { return this.authService.currentUser()?.role === 'FREELANCER'; }
  get isCompany(): boolean    { return this.authService.currentUser()?.role === 'COMPANY'; }
  get hasProfile(): boolean   { return !!this.freelancer() || !!this.company(); }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    return environment.apiUrl.replace(/\/api$/, '') + relativePath;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown && (this.isFreelancer || this.isCompany)) {
      this.notificationService.getUnreadCount().subscribe();
    }
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.showDropdown = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) this.showMobileMenu = false;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    this.showDropdown = false;
  }

  logout(): void { this.showDropdown = false; this.showMobileMenu = false; this.authService.logout(); }
  toggleTheme(): void { this.themeService.toggle(); }
  setLang(lang: AppLanguage): void { this.languageService.setLanguage(lang); }

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }
}
