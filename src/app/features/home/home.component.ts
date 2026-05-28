import { Component, OnInit, AfterViewInit, OnDestroy, NgZone, HostListener, signal, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { MissionService, AiSearchResult } from '../../core/services/mission.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { FeedbackPublicDto } from '../../core/models/feedback.model';
import { OffersService, PointPack } from '../../core/services/offers.service';
import { environment } from '../../../environments/environment';

interface StatItem {
  target: number;
  suffix: string;
  label: string;
  current: number;
}

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, DecimalPipe, NavbarComponent, FooterComponent, TranslateModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  showScrollTop = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 400;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateToRegister(role: 'freelancer' | 'company'): void {
    sessionStorage.setItem('register_role', role);
    this.router.navigate(['/auth/register']);
  }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const navbarHeight = (document.querySelector('.navbar') as HTMLElement)?.offsetHeight ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();}

  // ─── Feedbacks ───────────────────────────────────────────────────────────
  companyFeedbacks = signal<FeedbackPublicDto[]>([]);
  freelancerFeedbacks = signal<FeedbackPublicDto[]>([]);
  companyPage = 0;
  freelancerPage = 0;
  private langSub?: Subscription;

  readonly CARDS_VISIBLE = 3;

  totalPages(list: FeedbackPublicDto[]): number {
    return Math.ceil(list.length / this.CARDS_VISIBLE);
  }

  pagesArray(list: FeedbackPublicDto[]): number[] {
    return Array.from({ length: this.totalPages(list) }, (_, i) => i);
  }

  visibleCards(list: FeedbackPublicDto[], page: number): FeedbackPublicDto[] {
    const start = page * this.CARDS_VISIBLE;
    return list.slice(start, start + this.CARDS_VISIBLE);
  }

  prevCarousel(type: 'company' | 'freelancer'): void {
    if (type === 'company') {
      const pages = this.totalPages(this.companyFeedbacks());
      this.companyPage = (this.companyPage - 1 + pages) % pages;
    } else {
      const pages = this.totalPages(this.freelancerFeedbacks());
      this.freelancerPage = (this.freelancerPage - 1 + pages) % pages;
    }
  }

  nextCarousel(type: 'company' | 'freelancer'): void {
    if (type === 'company') {
      this.companyPage = (this.companyPage + 1) % this.totalPages(this.companyFeedbacks());
    } else {
      this.freelancerPage = (this.freelancerPage + 1) % this.totalPages(this.freelancerFeedbacks());
    }
  }

  starsArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getPhotoUrl(path: string | undefined): string {
    if (!path) return '';
    const base = environment.apiUrl.replace(/\/api$/, '');
    return base + path;
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  // ─── Recommended Missions ────────────────────────────────────────────────
  recommendedMissions = signal<AiSearchResult[]>([]);
  recommendedLoading = signal(false);

  // ─── Home Packs (pricing section) ────────────────────────────────────────
  homePacks = signal<PointPack[]>([]);

  // Marquee uniquement si les cartes dépassent la largeur de l'écran (~5 cartes × 340px = 1700px)
  get useMarquee(): boolean {
    return this.recommendedMissions().length >= 5;
  }

  getFileUrl(relativePath: string | undefined): string {
    if (!relativePath) return '';
    const baseUrl = environment.apiUrl.replace(/\/api$/, '');
    return baseUrl + relativePath;
  }

  activeTab: 'freelancers' | 'companies' = 'freelancers';
  activeSearchTab: 'keyword' | 'ai' = 'keyword';
  heroSearch = '';
  heroLocation = '';
  heroAiPrompt = '';
  heroCompanyAiPrompt = '';
  restrictedModal = false;
  restrictedFor: 'company' | 'freelancer' = 'company';

  get isFreelancer(): boolean {
    return this.authService.isAuthenticated() && this.authService.userRole() === 'FREELANCER';
  }

  get isCompany(): boolean {
    return this.authService.isAuthenticated() && this.authService.userRole() === 'COMPANY';
  }

  openRestricted(target: 'company' | 'freelancer'): void {
    this.restrictedFor = target;
    this.restrictedModal = true;
  }
  closeRestricted(): void { this.restrictedModal = false; }

  openFaqIndex = -1;

  faqs = [
    { q: 'home.faq_q1', a: 'home.faq_a1' },
    { q: 'home.faq_q2', a: 'home.faq_a2' },
    { q: 'home.faq_q3', a: 'home.faq_a3' },
    { q: 'home.faq_q4', a: 'home.faq_a4' },
    { q: 'home.faq_q5', a: 'home.faq_a5' },
    { q: 'home.faq_q6', a: 'home.faq_a6' },
    { q: 'home.faq_q7', a: 'home.faq_a7' },
  ];

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? -1 : index;
  }

  onHeroSearch(): void {
    if (this.activeSearchTab === 'ai') {
      this.onHeroAiSearch();
      return;
    }
    const q = this.heroSearch.trim();
    const location = this.heroLocation.trim();
    const queryParams: Record<string, string> = {};
    if (q) queryParams['q'] = q;
    if (location) queryParams['location'] = location;
    this.router.navigate(['/missions'], Object.keys(queryParams).length ? { queryParams } : {});
  }

  onHeroAiSearch(): void {
    const prompt = this.heroAiPrompt.trim();
    if (!prompt) return;
    this.router.navigate(['/missions'], { queryParams: { ai: 'true', prompt } });
  }

  onCompanyHeroSearch(): void {
    const q = this.heroSearch.trim();
    this.router.navigate(['/freelancers'], q ? { queryParams: { q } } : {});
  }

  onCompanyHeroAiSearch(): void {
    const prompt = this.heroCompanyAiPrompt.trim();
    if (!prompt) return;
    this.router.navigate(['/freelancers'], { queryParams: { ai: 'true', prompt } });
  }

  stats: StatItem[] = [
    { target: 0, suffix: '+', label: 'home.stats_freelancers', current: 0 },
    { target: 0, suffix: '+', label: 'home.stats_companies',   current: 0 },
    { target: 0, suffix: '+', label: 'home.stats_missions',    current: 0 },
    { target: 0, suffix: '%', label: 'home.stats_satisfaction',current: 0 },
  ];
  statsLoaded = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private missionService: MissionService,
    private feedbackService: FeedbackService,
    private offersService: OffersService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  formatTND(amount: number): string {
    return amount.toFixed(3).replace('.', ',') + ' DT';
  }

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(() => this.cdr.markForCheck());
    this.offersService.getCatalogPacks().subscribe({
      next: (packs) => this.homePacks.set(packs.slice(0, 2)),
    });

    // ── Fetch real platform stats ─────────────────────────────────────────────
    this.offersService.getPlatformStats().subscribe({
      next: (s) => {
        this.stats[0].target = s.freelancers;
        this.stats[1].target = s.companies;
        this.stats[2].target = s.missions;
        this.stats[3].target = s.satisfactionRate > 0 ? s.satisfactionRate : 98;
        this.statsLoaded = true;
        // Re-animate counters with real values
        this.animateStats();
      },
      error: () => {
        // Fallback to sensible defaults if backend unreachable
        this.stats[0].target = 0;
        this.stats[1].target = 0;
        this.stats[2].target = 0;
        this.stats[3].target = 98;
        this.statsLoaded = true;
        this.animateStats();
      }
    });

    this.feedbackService.getPublicFeedbacks().subscribe({
      next: (list) => {
        this.companyFeedbacks.set(list.filter(f => f.userRole === 'COMPANY'));
        this.freelancerFeedbacks.set(list.filter(f => f.userRole === 'FREELANCER'));
      }
    });

    if (this.isCompany) {
      this.activeTab = 'companies';
    }
    if (this.isFreelancer) {
      this.recommendedLoading.set(true);
      this.missionService.getRecommendedMissions(6).subscribe({
        next: (results) => {
          this.recommendedMissions.set(results);
          this.recommendedLoading.set(false);
        },
        error: () => this.recommendedLoading.set(false),
      });
    }
  }

  ngAfterViewInit(): void {
    // Animation lancée après réception des stats depuis le backend
    // (fallback déclenché dans ngOnInit si erreur)
  }

  private animateStats(): void {
    const duration = 2200;
    const steps = 80;
    const interval = duration / steps;

    this.stats.forEach((stat) => {
      let step = 0;
      const timer = setInterval(() => {
        step++;
        // ease-out cubic: fast at start, slows down at the end
        const progress = 1 - Math.pow(1 - step / steps, 3);
        stat.current = Math.round(progress * stat.target);
        if (step >= steps) {
          clearInterval(timer);
          stat.current = stat.target;
        }
      }, interval);
    });
  }

  formatNumber(num: number): string {
    return num >= 1000 ? num.toLocaleString('en-US') : num.toString();
  }
}
