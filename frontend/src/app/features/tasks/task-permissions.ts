import { Task, TaskStatus } from '../../core/models/task.model';
import { User } from '../../core/models/user.model';

// Copie les règles de backend/tasks.service.ts. C'est juste pour l'affichage des boutons,
// le backend revalide tout de toute façon.
const EDITABLE_STATUSES: TaskStatus[] = ['DRAFT', 'REJECTED'];

function isOwnEditableTask(task: Task, user: User): boolean {
  if (user.role === 'ADMINISTRATOR') return true;
  return task.creatorId === user.id && EDITABLE_STATUSES.includes(task.status);
}

export function canEdit(task: Task, user: User): boolean {
  return isOwnEditableTask(task, user);
}

export function canDelete(task: Task, user: User): boolean {
  return isOwnEditableTask(task, user);
}

export function canSubmit(task: Task, user: User): boolean {
  // soumettre est une transition de workflow : le statut compte même pour l'admin
  // (contrairement à éditer/supprimer, qui sont de la gestion de données)
  if (user.role === 'ADMINISTRATOR') return EDITABLE_STATUSES.includes(task.status);
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
