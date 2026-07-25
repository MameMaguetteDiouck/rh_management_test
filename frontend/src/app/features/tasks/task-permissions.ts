import { Task, TaskStatus } from '../../core/models/task.model';
import { User } from '../../core/models/user.model';

// Miroir de TasksService (backend, src/tasks/tasks.service.ts) — l'UI se contente de refléter
// ce que le serveur autorise déjà ; le backend reste la seule autorité réelle.
const EDITABLE_STATUSES: TaskStatus[] = ['DRAFT', 'REJECTED'];

function isOwnEditableTask(task: Task, user: User): boolean {
  return task.creatorId === user.id && EDITABLE_STATUSES.includes(task.status);
}

export function canEdit(task: Task, user: User): boolean {
  return isOwnEditableTask(task, user);
}

export function canDelete(task: Task, user: User): boolean {
  return isOwnEditableTask(task, user);
}

export function canSubmit(task: Task, user: User): boolean {
  return isOwnEditableTask(task, user);
}

function isReviewer(user: User): boolean {
  return user.role === 'MANAGER' || user.role === 'ADMINISTRATOR';
}

export function canValidate(task: Task, user: User): boolean {
  return isReviewer(user) && task.status === 'SUBMITTED';
}

export function canReject(task: Task, user: User): boolean {
  return isReviewer(user) && task.status === 'SUBMITTED';
}
