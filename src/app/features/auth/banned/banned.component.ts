import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-banned',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banned.component.html',
  styleUrl: './banned.component.css',
})
export class BannedComponent implements OnInit {
  banReason = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const state = history.state as { banReason?: string };
    this.banReason = state?.banReason ?? '';
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
