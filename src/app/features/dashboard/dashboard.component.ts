import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: '',
})
export class DashboardComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const role = this.authService.userRole();
    if (role === 'FREELANCER') {
      this.router.navigate(['/freelancer-dashboard'], { replaceUrl: true });
    } else if (role === 'COMPANY') {
      this.router.navigate(['/company-dashboard'], { replaceUrl: true });
    } else {
      this.router.navigate(['/'], { replaceUrl: true });
    }
  }
}
