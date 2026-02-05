import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // LinkedIn OAuth callback — MUST be before 'auth' to take priority
  {
    path: 'auth/linkedin/callback',
    loadComponent: () =>
      import('./features/auth/linkedin-callback/linkedin-callback.component').then(
        (m) => m.LinkedInCallbackComponent,
      ),
  },

  // Auth routes (login, register) — auth layout (no navbar)
  {
    path: 'auth',
    loadComponent: () =>
      import('./shared/layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Protected routes — main layout (navbar + footer)
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      // Freelancer profile routes
      {
        path: 'edit-profile',
        loadComponent: () =>
          import('./features/edit-profile/edit-profile.component').then(
            (m) => m.EditProfileComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/view-profile/view-profile.component').then(
            (m) => m.ViewProfileComponent,
          ),
      },
      {
        path: 'profile/:id',
        loadComponent: () =>
          import('./features/view-profile/view-profile.component').then(
            (m) => m.ViewProfileComponent,
          ),
      },
      // Company profile routes
      {
        path: 'edit-company-profile',
        loadComponent: () =>
          import('./features/edit-company-profile/edit-company-profile.component').then(
            (m) => m.EditCompanyProfileComponent,
          ),
      },
      {
        path: 'company-profile',
        loadComponent: () =>
          import('./features/view-company-profile/view-company-profile.component').then(
            (m) => m.ViewCompanyProfileComponent,
          ),
      },
      {
        path: 'company-profile/:id',
        loadComponent: () =>
          import('./features/view-company-profile/view-company-profile.component').then(
            (m) => m.ViewCompanyProfileComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Fallback
  { path: '**', redirectTo: 'auth/login' },
];
