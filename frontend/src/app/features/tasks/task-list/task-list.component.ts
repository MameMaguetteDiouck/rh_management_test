import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService } from '../data/tasks.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Task, TaskStatus } from '../../../core/models/task.model';
import { TASK_STATUS_BADGE_CLASSES, TASK_STATUS_LABELS } from '../task-status';
import { canDelete, canEdit, canReject, canSubmit, canValidate } from '../task-permissions';
import { TaskFormComponent } from '../task-form/task-form.component';
import { IconComponent } from '../../../shared/icon/icon.component';

type StatusFilter = TaskStatus | 'ALL';

@Component({
  selector: 'app-task-list',
  imports: [RouterLink, FormsModule, TaskFormComponent, DatePipe, IconComponent],
  templateUrl: './task-list.component.html',
})
export class TaskListComponent implements OnInit {
  private readonly tasksService = inject(TasksService);
  private readonly authService = inject(AuthService);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);

  protected readonly statusLabels = TASK_STATUS_LABELS;
  protected readonly statusBadgeClasses = TASK_STATUS_BADGE_CLASSES;

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<StatusFilter>('ALL');

  protected readonly selectedTaskId = signal<string | null>(null);
  protected readonly modalEditing = signal(false);
  protected readonly showRejectForm = signal(false);
  protected readonly rejectionReason = signal('');

  protected readonly title = computed(() => {
    const role = this.authService.currentUser()?.role;
    if (role === 'MANAGER') return 'Tâches à valider';
    if (role === 'ADMINISTRATOR') return 'Toutes les tâches';
    return 'Mes tâches';
  });

  protected readonly isManager = this.authService.isManager;
  protected readonly isCollab = this.authService.isCollab;
  protected readonly statusKeys = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;

  // calculés depuis la liste déjà chargée, pas besoin d'un endpoint dédié
  protected readonly statusCounts = computed(() => {
    const counts: Record<string, number> = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    for (const task of this.tasks()) counts[task.status]++;
    return counts;
  });

  protected readonly filteredTasks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.tasks().filter((task) => {
      const matchesStatus = status === 'ALL' || task.status === status;
      const matchesTerm =
        !term || task.title.toLowerCase().includes(term) || task.description.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  protected readonly selectedTask = computed(
    () => this.tasks().find((task) => task.id === this.selectedTaskId()) ?? null,
  );

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

  protected submitTask(task: Task): void {
    this.tasksService.submit(task.id).subscribe((updated) => this.replaceTask(updated));
  }

  protected confirmReject(): void {
    const task = this.selectedTask();
    if (!task || !this.rejectionReason().trim()) return;
    this.tasksService.reject(task.id, { rejectionReason: this.rejectionReason() }).subscribe((updated) => {
      this.replaceTask(updated);
      this.showRejectForm.set(false);
      this.rejectionReason.set('');
    });
  }

  protected deleteTask(task: Task): void {
    if (!confirm(`Supprimer la tâche "${task.title}" ?`)) return;
    this.tasksService.remove(task.id).subscribe(() => {
      this.tasks.update((tasks) => tasks.filter((t) => t.id !== task.id));
      this.closeModal();
    });
  }

  protected openModal(task: Task): void {
    this.selectedTaskId.set(task.id);
    this.modalEditing.set(false);
    this.showRejectForm.set(false);
    this.rejectionReason.set('');
  }

  protected openRejectModal(task: Task): void {
    this.openModal(task);
    this.showRejectForm.set(true);
  }

  protected closeModal(): void {
    this.selectedTaskId.set(null);
  }

  protected onEdited(updated: Task): void {
    this.replaceTask(updated);
    this.modalEditing.set(false);
  }

  private replaceTask(updated: Task): void {
    this.tasks.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
  }
}
