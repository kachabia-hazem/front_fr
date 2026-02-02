import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'linkedin/role-selection',
    loadComponent: () =>
      import('./linkedin-role-selection/linkedin-role-selection.component').then(
        (m) => m.LinkedInRoleSelectionComponent,
      ),
  },
  {
    path: 'linkedin/complete-profile',
    loadComponent: () =>
      import('./linkedin-complete-profile/linkedin-complete-profile.component').then(
        (m) => m.LinkedInCompleteProfileComponent,
      ),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
