import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Public landing page — shown when app opens without auth
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },

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

  // Freelancer dashboard — standalone (no navbar/footer)
  {
    path: 'freelancer-dashboard',
    loadComponent: () =>
      import('./features/freelancer-dashboard/freelancer-dashboard.component').then(
        (m) => m.FreelancerDashboardComponent,
      ),
    canActivate: [authGuard],
  },

  // Freelancer applications — standalone (no navbar/footer)
  {
    path: 'freelancer-applications',
    loadComponent: () =>
      import('./features/freelancer-applications/freelancer-applications.component').then(
        (m) => m.FreelancerApplicationsComponent,
      ),
    canActivate: [authGuard],
  },

  // Freelancer balance — standalone (no navbar/footer)
  {
    path: 'freelancer-balance',
    loadComponent: () =>
      import('./features/freelancer-balance/freelancer-balance.component').then(
        (m) => m.FreelancerBalanceComponent,
      ),
    canActivate: [authGuard],
  },

  // Freelancer transactions — standalone (no navbar/footer)
  {
    path: 'freelancer-transactions',
    loadComponent: () =>
      import('./features/freelancer-transactions/freelancer-transactions.component').then(
        (m) => m.FreelancerTransactionsComponent,
      ),
    canActivate: [authGuard],
  },

  // Company transactions — standalone (no navbar/footer)
  {
    path: 'company-transactions',
    loadComponent: () =>
      import('./features/company-transactions/company-transactions.component').then(
        (m) => m.CompanyTransactionsComponent,
      ),
    canActivate: [authGuard],
  },

  // Company dashboard — standalone (no navbar/footer)
  {
    path: 'company-dashboard',
    loadComponent: () =>
      import('./features/company-dashboard/company-dashboard.component').then(
        (m) => m.CompanyDashboardComponent,
      ),
    canActivate: [authGuard],
  },

  // Company missions list — standalone (no navbar/footer)
  {
    path: 'company-missions',
    loadComponent: () =>
      import('./features/company-missions/company-missions.component').then(
        (m) => m.CompanyMissionsComponent,
      ),
    canActivate: [authGuard],
  },

  // Company all applications — standalone (no navbar/footer)
  {
    path: 'company-applications',
    loadComponent: () =>
      import('./features/company-applications/company-applications.component').then(
        (m) => m.CompanyApplicationsComponent,
      ),
    canActivate: [authGuard],
  },

  // Freelancer notifications — standalone (no navbar/footer)
  {
    path: 'freelancer-notifications',
    loadComponent: () =>
      import('./features/freelancer-notifications/freelancer-notifications.component').then(
        (m) => m.FreelancerNotificationsComponent,
      ),
    canActivate: [authGuard],
  },

  // Company notifications — standalone (no navbar/footer)
  {
    path: 'company-notifications',
    loadComponent: () =>
      import('./features/company-notifications/company-notifications.component').then(
        (m) => m.CompanyNotificationsComponent,
      ),
    canActivate: [authGuard],
  },

  // Freelancer contracts — standalone (no navbar/footer)
  {
    path: 'freelancer-contracts',
    loadComponent: () =>
      import('./features/freelancer-contracts/freelancer-contracts.component').then(
        (m) => m.FreelancerContractsComponent,
      ),
    canActivate: [authGuard],
  },

  // Company contracts — standalone (no navbar/footer)
  {
    path: 'company-contracts',
    loadComponent: () =>
      import('./features/company-contracts/company-contracts.component').then(
        (m) => m.CompanyContractsComponent,
      ),
    canActivate: [authGuard],
  },

  {
    path: 'company-subscription',
    loadComponent: () =>
      import('./features/company-subscription/company-subscription.component').then(
        (m) => m.CompanySubscriptionComponent,
      ),
    canActivate: [authGuard],
  },

  // Company balance — standalone (no navbar/footer)
  {
    path: 'company-balance',
    loadComponent: () =>
      import('./features/company-balance/company-balance.component').then(
        (m) => m.CompanyBalanceComponent,
      ),
    canActivate: [authGuard],
  },

  // Offers / pricing page — standalone (no navbar/footer)
  {
    path: 'offers',
    loadComponent: () =>
      import('./features/offers/offers.component').then(
        (m) => m.OffersComponent,
      ),
  },

  // Freelancer missions list — standalone (no navbar/footer)
  {
    path: 'freelancer-missions',
    loadComponent: () =>
      import('./features/freelancer-missions/freelancer-missions.component').then(
        (m) => m.FreelancerMissionsComponent,
      ),
    canActivate: [authGuard],
  },

  // Company mission control list — standalone (no navbar/footer)
  {
    path: 'company-mission-control',
    loadComponent: () =>
      import('./features/company-mission-control/company-mission-control.component').then(
        (m) => m.CompanyMissionControlComponent,
      ),
    canActivate: [authGuard],
  },

  // Company mission view (read-only workspace) — standalone (no navbar/footer)
  {
    path: 'company-mission-view/:id',
    loadComponent: () =>
      import('./features/company-mission-view/company-mission-view.component').then(
        (m) => m.CompanyMissionViewComponent,
      ),
    canActivate: [authGuard],
  },

  // Active mission workspace — standalone (no navbar/footer)
  {
    path: 'active-mission/:id',
    loadComponent: () =>
      import('./features/active-mission/active-mission.component').then(
        (m) => m.ActiveMissionComponent,
      ),
    canActivate: [authGuard],
  },

  // Legit (dispute) form — standalone (no navbar/footer)
  {
    path: 'legit/:missionId',
    loadComponent: () =>
      import('./features/legit-form/legit-form.component').then(
        (m) => m.LegitFormComponent,
      ),
    canActivate: [authGuard],
  },

  // Messaging — standalone (no navbar/footer)
  {
    path: 'messaging',
    loadComponent: () =>
      import('./features/messaging/messaging.component').then(
        (m) => m.MessagingComponent,
      ),
    canActivate: [authGuard],
  },

  // Mission applications — standalone (no navbar/footer)
  {
    path: 'mission-applications/:missionId',
    loadComponent: () =>
      import('./features/mission-applications/mission-applications.component').then(
        (m) => m.MissionApplicationsComponent,
      ),
    canActivate: [authGuard],
  },

  // Public routes — main layout (navbar + footer), no auth required
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent,
      ),
    children: [
      {
        path: 'missions',
        loadComponent: () =>
          import('./features/missions/missions.component').then(
            (m) => m.MissionsComponent,
          ),
      },
      {
        path: 'missions/:id',
        loadComponent: () =>
          import('./features/mission-detail/mission-detail.component').then(
            (m) => m.MissionDetailComponent,
          ),
      },
      {
        path: 'freelancers',
        loadComponent: () =>
          import('./features/freelancers/freelancers.component').then(
            (m) => m.FreelancersComponent,
          ),
      },
    ],
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
      // Post a job (Company only)
      {
        path: 'post-job',
        loadComponent: () =>
          import('./features/post-job/post-job.component').then(
            (m) => m.PostJobComponent,
          ),
      },
      // Edit a mission (Company only)
      {
        path: 'edit-mission/:id',
        loadComponent: () =>
          import('./features/post-job/post-job.component').then(
            (m) => m.PostJobComponent,
          ),
      },
      // Customize card (Freelancer only)
      {
        path: 'customize-card',
        loadComponent: () =>
          import('./features/customize-card/customize-card.component').then(
            (m) => m.CustomizeCardComponent,
          ),
      },
      // Freelancers list
      {
        path: 'freelancers',
        loadComponent: () =>
          import('./features/freelancers/freelancers.component').then(
            (m) => m.FreelancersComponent,
          ),
      },
      // Freelancer saved missions
      {
        path: 'saved-missions',
        loadComponent: () =>
          import('./features/saved-missions/saved-missions.component').then(
            (m) => m.SavedMissionsComponent,
          ),
      },
      // Apply to a mission (Freelancer)
      {
        path: 'apply/:id',
        loadComponent: () =>
          import('./features/apply-mission/apply-mission.component').then(
            (m) => m.ApplyMissionComponent,
          ),
      },
      // Mission detail (must be before the list route)
      {
        path: 'missions/:id',
        loadComponent: () =>
          import('./features/mission-detail/mission-detail.component').then(
            (m) => m.MissionDetailComponent,
          ),
      },
      // Missions list
      {
        path: 'missions',
        loadComponent: () =>
          import('./features/missions/missions.component').then(
            (m) => m.MissionsComponent,
          ),
      },
    ],
  },

  // Payment result pages
  {
    path: 'payment/success',
    loadComponent: () =>
      import('./features/payment-success/payment-success.component').then(
        (m) => m.PaymentSuccessComponent,
      ),
  },
  {
    path: 'payment/cancel',
    loadComponent: () =>
      import('./features/payment-cancel/payment-cancel.component').then(
        (m) => m.PaymentCancelComponent,
      ),
  },

  // Settings — standalone (no navbar/footer)
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
    canActivate: [authGuard],
  },

  // Admin Dashboard — layout séparé, protégé par adminGuard
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [adminGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
