import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'users',
    loadComponent: () => import('./users/user-list/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: 'users/new',
    loadComponent: () =>
      import('./users/user-form/user-create-page.component').then((m) => m.UserCreatePageComponent),
  },
];
