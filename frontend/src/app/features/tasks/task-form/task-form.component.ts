import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TasksService } from '../data/tasks.service';
import { Task } from '../../../core/models/task.model';
import { AuthService } from '../../../core/auth/auth.service';
import { UsersService } from '../../../core/users/users.service';
import { User } from '../../../core/models/user.model';
import { extractErrorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/notifications/toast.service';
import { ROLE_LABELS } from '../../../core/models/role-labels';

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
  private readonly toastService = inject(ToastService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly assignableUsers = signal<User[]>([]);
  protected readonly roleLabels = ROLE_LABELS;

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
      // l'admin peut assigner à un manager ou un collaborateur ; un manager, uniquement à un collaborateur
      const assignableRoles = this.authService.isAdmin() ? ['COLLABORATOR', 'MANAGER'] : ['COLLABORATOR'];
      this.usersService
        .list(1, 200)
        .subscribe(({ items }) => this.assignableUsers.set(items.filter((u) => assignableRoles.includes(u.role))));
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
              this.notify('Tâche créée et soumise pour validation.');
              this.saved.emit(submitted);
            },
            error: (err: unknown) => this.handleError(err),
          });
          return;
        }
        this.submitting.set(false);
        this.notify(this.successMessage(id, creatorId));
        this.saved.emit(task);
      },
      error: (err: unknown) => this.handleError(err),
    });
  }

  // saved.emit() ci-dessus déclenche souvent une navigation qui détruit ce composant :
  // on décale l'affichage du toast d'un tick pour ne pas le perdre dans la transition de route.
  private notify(message: string): void {
    setTimeout(() => this.toastService.success(message));
  }

  private successMessage(editedTaskId: string | null, creatorId: string): string {
    if (editedTaskId) return 'Tâche mise à jour.';
    if (creatorId) {
      const assignee = this.assignableUsers().find((user) => user.id === creatorId);
      return assignee
        ? `Tâche assignée à ${assignee.firstName} ${assignee.lastName}.`
        : 'Tâche assignée.';
    }
    return 'Tâche créée.';
  }

  private handleError(err: unknown): void {
    this.submitting.set(false);
    this.errorMessage.set(extractErrorMessage(err));
  }
}
