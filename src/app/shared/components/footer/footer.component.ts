import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/']);
  }

  goToSection(id: string): void {
    if (this.router.url === '/') {
      const el = document.getElementById(id);
      if (!el) return;
      const navbarHeight = (document.querySelector('.navbar') as HTMLElement)?.offsetHeight ?? 0;
      const top = el.getBoundingClientRect().top + window.scrollY - navbarHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      this.router.navigate(['/']);
    }
  }

  navigateToRegister(role: 'freelancer' | 'company'): void {
    sessionStorage.setItem('register_role', role);
    this.router.navigate(['/auth/register']);
  }
}
