import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    loadComponent: () =>
      import('./overview/admin-overview.component').then(m => m.AdminOverviewComponent),
  },
  {
    path: 'verifications',
    loadComponent: () =>
      import('./verifications/admin-verifications.component').then(m => m.AdminVerificationsComponent),
  },
  {
    path: 'verifications/:id',
    loadComponent: () =>
      import('./company-detail/admin-company-detail.component').then(m => m.AdminCompanyDetailComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./users/admin-users.component').then(m => m.AdminUsersComponent),
  },
  {
    path: 'missions',
    loadComponent: () =>
      import('./missions/admin-missions.component').then(m => m.AdminMissionsComponent),
  },
  {
    path: 'contracts',
    loadComponent: () =>
      import('./contracts/admin-contracts.component').then(m => m.AdminContractsComponent),
  },
  {
    path: 'feedbacks',
    loadComponent: () =>
      import('./feedbacks/admin-feedbacks.component').then(m => m.AdminFeedbacksComponent),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./notifications/admin-notifications.component').then(m => m.AdminNotificationsComponent),
  },
  {
    path: 'offers',
    loadComponent: () =>
      import('./offers/admin-offers.component').then(m => m.AdminOffersComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/admin-reports.component').then(m => m.AdminReportsComponent),
  },
  {
    path: 'legits',
    loadComponent: () =>
      import('./legits/admin-legits.component').then(m => m.AdminLegitsComponent),
  },
  {
    path: 'transactions',
    loadComponent: () =>
      import('./transactions/admin-transactions.component').then(m => m.AdminTransactionsComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/admin-settings.component').then(m => m.AdminSettingsComponent),
  },
];
