import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LinkedInProfile } from '../../../core/models/auth.model';

@Component({
  selector: 'app-linkedin-role-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './linkedin-role-selection.component.html',
  styles: [`
    .role-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #dce8ec;
    }
    .role-card {
      background: #fff;
      border-radius: 1.25rem;
      padding: 2.5rem;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      text-align: center;
    }
    .profile-info {
      margin-bottom: 1.5rem;
    }
    .profile-info img {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin-bottom: 0.75rem;
    }
    .profile-info h3 {
      margin: 0;
      color: #1a1a2e;
      font-size: 1.1rem;
    }
    .profile-info p {
      color: #6b7280;
      font-size: 0.85rem;
      margin: 0.25rem 0 0;
    }
    h2 {
      font-size: 1.5rem;
      color: #1a1a2e;
      margin: 0 0 0.5rem;
    }
    .subtitle {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .role-options {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .role-btn {
      flex: 1;
      padding: 1.5rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 1rem;
      background: #fff;
      cursor: pointer;
      transition: all 0.2s;
    }
    .role-btn:hover {
      border-color: #4e9e92;
      background: #f0fdf4;
    }
    .role-btn h4 {
      margin: 0.75rem 0 0.25rem;
      color: #1a1a2e;
      font-size: 1rem;
    }
    .role-btn p {
      margin: 0;
      color: #6b7280;
      font-size: 0.8rem;
    }
    .role-icon {
      font-size: 2rem;
    }
  `],
})
export class LinkedInRoleSelectionComponent implements OnInit {
  profile: LinkedInProfile | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const data = sessionStorage.getItem('linkedin_profile');
    if (!data) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.profile = JSON.parse(data);
  }

  selectRole(role: 'FREELANCER' | 'COMPANY'): void {
    sessionStorage.setItem('linkedin_selected_role', role);
    this.router.navigate(['/auth/linkedin/complete-profile']);
  }
}
