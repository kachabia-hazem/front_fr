import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/services/auth.service';
import { filter, Subscription } from 'rxjs';

const GUEST_ACTION_KEY = 'guest_action_count';
const ACTION_THRESHOLD = 20;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('freelance-platform-frontend');
  showGuestModal = false;

  private navSub!: Subscription;
  private scrollTimer: any = null;
  private clickHandler!: () => void;
  private scrollHandler!: () => void;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Track page navigations
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.recordAction(3));

    // Track clicks (each click = 1 action)
    this.clickHandler = () => this.recordAction(1);
    document.addEventListener('click', this.clickHandler, { passive: true });

    // Track scroll (debounced, each scroll burst = 1 action)
    this.scrollHandler = () => {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => this.recordAction(1), 400);
    };
    document.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    document.removeEventListener('click', this.clickHandler);
    document.removeEventListener('scroll', this.scrollHandler);
    clearTimeout(this.scrollTimer);
  }

  private isAuthRoute(): boolean {
    const url = this.router.url;
    return url.startsWith('/auth/') || url === '/auth';
  }

  private recordAction(weight: number): void {
    if (this.authService.isAuthenticated()) return;
    if (this.showGuestModal) return;
    if (this.isAuthRoute()) return;

    const count = parseInt(sessionStorage.getItem(GUEST_ACTION_KEY) ?? '0', 10) + weight;
    sessionStorage.setItem(GUEST_ACTION_KEY, String(count));

    if (count >= ACTION_THRESHOLD) {
      this.showGuestModal = true;
      document.body.style.overflow = 'hidden';
    }
  }

  dismissGuestModal(): void {
    this.showGuestModal = false;
    document.body.style.overflow = '';
    sessionStorage.setItem(GUEST_ACTION_KEY, '0');
  }
}
