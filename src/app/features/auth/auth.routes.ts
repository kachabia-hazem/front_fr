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
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'register/verify',
    loadComponent: () =>
      import('./register/register-verify/register-verify.component').then(
        (m) => m.RegisterVerifyComponent,
      ),
  },
  {
    path: 'company-pending',
    loadComponent: () =>
      import('./company-pending/company-pending.component').then(
        (m) => m.CompanyPendingComponent,
      ),
  },
  {
    path: 'company-under-review',
    loadComponent: () =>
      import('./company-under-review/company-under-review.component').then(
        (m) => m.CompanyUnderReviewComponent,
      ),
  },
  {
    path: 'banned',
    loadComponent: () =>
      import('./banned/banned.component').then((m) => m.BannedComponent),
  },
  {
    path: 'oauth/role-selection',
    loadComponent: () =>
      import('./oauth-role-selection/oauth-role-selection.component').then(
        (m) => m.OAuthRoleSelectionComponent,
      ),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
