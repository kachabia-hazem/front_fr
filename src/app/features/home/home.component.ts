import { Component, OnInit, AfterViewInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

interface StatItem {
  target: number;
  suffix: string;
  label: string;
  current: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule, NavbarComponent, FooterComponent],
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

  ngOnDestroy(): void {}

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
    {
      q: 'Who can access Worklink?',
      a: 'Worklink is designed for verified freelancers and companies. Access is limited to professional users to ensure quality, trust, and meaningful collaborations.'
    },
    {
      q: 'What makes Worklink different from other platforms?',
      a: 'Worklink focuses on quality over quantity. Unlike traditional platforms, it connects verified freelancers with serious clients, reduces noise, and offers tools designed to improve visibility and real work opportunities.'
    },
    {
      q: 'Is Worklink free to use?',
      a: 'Yes, Worklink offers a free version with basic access. However, premium plans are available to unlock advanced features and the full potential of the platform.'
    },
    {
      q: 'How does Worklink help freelancers find work?',
      a: 'Worklink helps freelancers by matching their skills with relevant projects, improving their visibility to companies, and providing tools to connect directly with potential clients.'
    },
    {
      q: 'Are there limits on messages or applications?',
      a: 'Yes, the free plan includes limited messages and applications. Upgrading to a premium plan removes these limits and allows unlimited interactions.'
    },
    {
      q: 'Can we post job offers or projects?',
      a: 'Yes, companies can post job offers and projects to reach qualified freelancers quickly and efficiently.'
    },
    {
      q: 'Is there a rating or feedback system?',
      a: 'Yes, Worklink includes a rating and feedback system to promote transparency, build trust, and help users make informed decisions.'
    },
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
    { target: 1200, suffix: '+', label: 'Freelancers',       current: 0 },
    { target: 350,  suffix: '+', label: 'Companies',         current: 0 },
    { target: 2500, suffix: '+', label: 'Missions Posted',   current: 0 },
    { target: 98,   suffix: '%', label: 'Satisfaction Rate', current: 0 },
  ];

  constructor(
    public authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    if (this.isCompany) {
      this.activeTab = 'companies';
    }
  }

  ngAfterViewInit(): void {
    // Start counter immediately when page loads (after a short render delay)
    setTimeout(() => this.animateStats(), 400);
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
