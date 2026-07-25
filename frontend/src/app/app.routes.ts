import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { landingGuard } from './core/auth/landing.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', canActivate: [landingGuard], children: [] },
      {
        path: 'tasks',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASKS_ROUTES),
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'admin',
        canActivate: [roleGuard('ADMINISTRATOR')],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
