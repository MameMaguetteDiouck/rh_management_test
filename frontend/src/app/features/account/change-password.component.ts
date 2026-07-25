import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);

    this.authService.changePassword(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('Mot de passe mis à jour.');
        this.form.reset();
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const message =
          err instanceof HttpErrorResponse ? (err.error?.message ?? 'Une erreur est survenue.') : 'Une erreur est survenue.';
        this.errorMessage.set(message);
      },
    });
  }
}
