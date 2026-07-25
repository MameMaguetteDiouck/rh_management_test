import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService } from '../data/tasks.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task } from '../../../core/models/task.model';
import { TASK_STATUS_BADGE_CLASSES, TASK_STATUS_LABELS } from '../task-status';
import { canDelete, canEdit, canReject, canSubmit, canValidate } from '../task-permissions';
import { TaskFormComponent } from '../task-form/task-form.component';

@Component({
  selector: 'app-task-list',
  imports: [RouterLink, FormsModule, TaskFormComponent, DatePipe],
  templateUrl: './task-list.component.html',
})
export class TaskListComponent implements OnInit {
  private readonly tasksService = inject(TasksService);
  private readonly authService = inject(AuthService);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);

  protected readonly statusLabels = TASK_STATUS_LABELS;
  protected readonly statusBadgeClasses = TASK_STATUS_BADGE_CLASSES;

  protected readonly rejectingId = signal<string | null>(null);
  protected readonly rejectionReason = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly expandedId = signal<string | null>(null);

  protected readonly title = computed(() => {
    const role = this.authService.currentUser()?.role;
    if (role === 'MANAGER') return 'Tâches à valider';
    if (role === 'ADMINISTRATOR') return 'Toutes les tâches';
    return 'Mes tâches';
  });

  ngOnInit(): void {
    this.tasksService.list().subscribe((tasks) => {
      this.tasks.set(tasks);
      this.loading.set(false);
    });
  }

  protected canValidate(task: Task): boolean {
    const user = this.authService.currentUser();
    return !!user && canValidate(task, user);
  }

  protected canReject(task: Task): boolean {
    const user = this.authService.currentUser();
    return !!user && canReject(task, user);
  }

  protected canEdit(task: Task): boolean {
    const user = this.authService.currentUser();
    return !!user && canEdit(task, user);
  }

  protected canDelete(task: Task): boolean {
    const user = this.authService.currentUser();
    return !!user && canDelete(task, user);
  }

  protected canSubmit(task: Task): boolean {
    const user = this.authService.currentUser();
    return !!user && canSubmit(task, user);
  }

  protected validateTask(task: Task): void {
    this.tasksService.validate(task.id).subscribe((updated) => this.replaceTask(updated));
  }

  protected confirmReject(task: Task): void {
    if (!this.rejectionReason().trim()) return;
    this.tasksService.reject(task.id, { rejectionReason: this.rejectionReason() }).subscribe((updated) => {
      this.replaceTask(updated);
      this.rejectingId.set(null);
      this.rejectionReason.set('');
    });
  }

  protected submitTask(task: Task): void {
    this.tasksService.submit(task.id).subscribe((updated) => this.replaceTask(updated));
  }

  protected deleteTask(task: Task): void {
    if (!confirm(`Supprimer la tâche "${task.title}" ?`)) return;
    this.tasksService.remove(task.id).subscribe(() => {
      this.tasks.update((tasks) => tasks.filter((t) => t.id !== task.id));
    });
  }

  protected toggleExpand(task: Task): void {
    this.expandedId.set(this.expandedId() === task.id ? null : task.id);
  }

  protected onEdited(updated: Task): void {
    this.replaceTask(updated);
    this.editingId.set(null);
  }

  private replaceTask(updated: Task): void {
    this.tasks.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
  }
}
