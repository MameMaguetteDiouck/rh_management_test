import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TaskFormComponent } from './task-form.component';

@Component({
  selector: 'app-task-create-page',
  imports: [TaskFormComponent],
  template: `
    <h1 class="mb-4 text-lg font-semibold text-slate-900">Nouvelle tâche</h1>
    <app-task-form (saved)="onSaved()" />
  `,
})
export class TaskCreatePageComponent {
  private readonly router = inject(Router);

  protected onSaved(): void {
    this.router.navigateByUrl('/tasks');
  }
}
