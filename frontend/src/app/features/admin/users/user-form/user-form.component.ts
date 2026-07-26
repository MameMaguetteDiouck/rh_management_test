import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../../../core/users/users.service';
import { Role, User } from '../../../../core/models/user.model';
import { ROLE_LABELS } from '../../../../core/models/role-labels';

const ROLES: Role[] = ['COLLABORATOR', 'MANAGER', 'ADMINISTRATOR'];

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  // reçoit l'objet direct (déjà dispo dans la liste), y a pas de GET /users/:id côté backend de toute façon
  readonly initialUser = input<User | null>(null);
  readonly saved = output<User>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly isEdit = computed(() => this.initialUser() !== null);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(1)]],
    lastName: ['', [Validators.required, Validators.minLength(1)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['COLLABORATOR' as Role, [Validators.required]],
  });

  ngOnInit(): void {
    const user = this.initialUser();
    if (!user) {
      this.form.controls.password.addValidators([Validators.required, Validators.minLength(6)]);
      return;
    }
    this.form.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    const { password, ...rest } = this.form.getRawValue();
    const user = this.initialUser();
    const request = user ? this.usersService.update(user.id, rest) : this.usersService.create({ ...rest, password });

    request.subscribe({
      next: (saved) => {
        this.submitting.set(false);
        this.saved.emit(saved);
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
