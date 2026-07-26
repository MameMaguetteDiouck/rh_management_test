import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TasksService } from '../data/tasks.service';
import { Task } from '../../../core/models/task.model';
import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/users/users.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  templateUrl: './task-form.component.html',
})
export class TaskFormComponent implements OnInit {
  readonly taskId = input<string | null>(null);
  readonly saved = output<Task>();

  private readonly fb = inject(FormBuilder);
  private readonly tasksService = inject(TasksService);
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly collaborators = signal<User[]>([]);

  // pas de réassignation possible une fois la tâche créée
  protected readonly canAssign = computed(
    () => !this.taskId() && (this.authService.isManager() || this.authService.isAdmin()),
  );

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: ['', [Validators.required, Validators.minLength(1)]],
    creatorId: [''],
  });

  ngOnInit(): void {
    if (this.canAssign()) {
      this.usersService
        .list()
        .subscribe((users) => this.collaborators.set(users.filter((u) => u.role === 'COLLABORATOR')));
    }

    const id = this.taskId();
    if (!id) return;

    this.tasksService.get(id).subscribe((task) => {
      this.form.patchValue({ title: task.title, description: task.description });
    });
  }

  // méthode et pas computed() ici, la valeur du FormControl n'étant pas un signal
  // (un computed() ne se réévaluerait pas quand le select change)
  protected canSubmitDirectly(): boolean {
    // que pour soi-même : assigner puis soumettre à la place du collaborateur n'a pas de sens
    return !this.taskId() && !(this.canAssign() && this.form.controls.creatorId.value);
  }

  protected submit(submitDirectly = false): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    const { title, description, creatorId } = this.form.getRawValue();
    const payload = creatorId ? { title, description, creatorId } : { title, description };
    const id = this.taskId();
    const request = id ? this.tasksService.update(id, payload) : this.tasksService.create(payload);

    request.subscribe({
      next: (task) => {
        if (submitDirectly && !id) {
          this.tasksService.submit(task.id).subscribe({
            next: (submitted) => {
              this.submitting.set(false);
              this.saved.emit(submitted);
            },
            error: (err: unknown) => this.handleError(err),
          });
          return;
        }
        this.submitting.set(false);
        this.saved.emit(task);
      },
      error: (err: unknown) => this.handleError(err),
    });
  }

  private handleError(err: unknown): void {
    this.submitting.set(false);
    const message =
      err instanceof HttpErrorResponse ? (err.error?.message ?? 'Une erreur est survenue.') : 'Une erreur est survenue.';
    this.errorMessage.set(message);
  }
}
