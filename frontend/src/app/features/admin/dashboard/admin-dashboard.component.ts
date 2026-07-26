import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UsersService } from '../../../core/users/users.service';
import { TasksService } from '../../tasks/data/tasks.service';
import { User } from '../../../core/models/user.model';
import { Task, TaskStatus } from '../../../core/models/task.model';
import { ROLE_LABELS } from '../../../core/models/role-labels';
import { TASK_STATUS_LABELS } from '../../tasks/task-status';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly tasksService = inject(TasksService);

  protected readonly users = signal<User[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly statusLabels = TASK_STATUS_LABELS;
  protected readonly roleKeys = ['COLLABORATOR', 'MANAGER', 'ADMINISTRATOR'] as const;
  protected readonly statusKeys = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;

  protected readonly usersByRole = computed(() => {
    const counts: Record<string, number> = { COLLABORATOR: 0, MANAGER: 0, ADMINISTRATOR: 0 };
    for (const user of this.users()) counts[user.role]++;
    return counts;
  });

  protected readonly tasksByStatus = computed(() => {
    const counts: Record<TaskStatus, number> = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    for (const task of this.tasks()) counts[task.status]++;
    return counts;
  });

  ngOnInit(): void {
    forkJoin({ users: this.usersService.list(), tasks: this.tasksService.list() }).subscribe(({ users, tasks }) => {
      this.users.set(users);
      this.tasks.set(tasks);
      this.loading.set(false);
    });
  }
}
