import { Routes } from '@angular/router';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./task-list/task-list.component').then((m) => m.TaskListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./task-form/task-create-page.component').then((m) => m.TaskCreatePageComponent),
  },
];
