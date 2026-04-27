import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company-pending',
  standalone: true,
  templateUrl: './company-pending.component.html',
  styleUrl: './company-pending.component.css',
})
export class CompanyPendingComponent {
  constructor(private router: Router) {}

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
