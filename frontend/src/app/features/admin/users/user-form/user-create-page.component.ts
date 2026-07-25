import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserFormComponent } from './user-form.component';

@Component({
  selector: 'app-user-create-page',
  imports: [UserFormComponent],
  template: `
    <h1 class="mb-4 text-lg font-semibold text-slate-900">Nouvel utilisateur</h1>
    <app-user-form (saved)="onSaved()" />
  `,
})
export class UserCreatePageComponent {
  private readonly router = inject(Router);

  protected onSaved(): void {
    this.router.navigateByUrl('/admin/users');
  }
}
