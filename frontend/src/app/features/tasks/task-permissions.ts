import { Task, TaskStatus } from '../../core/models/task.model';
import { User } from '../../core/models/user.model';

// Copie les règles de backend/tasks.service.ts. C'est juste pour l'affichage des boutons,
// le backend revalide tout de toute façon.
const EDITABLE_STATUSES: TaskStatus[] = ['DRAFT', 'REJECTED'];

function isOwnEditableTask(task: Task, user: User): boolean {
  if (user.role === 'ADMINISTRATOR') return true;
  return task.creatorId === user.id && EDITABLE_STATUSES.includes(task.status);
}

// le manager qui a lui-même assigné la tâche peut aussi la corriger/l'annuler, en plus du créateur et de l'admin
function isManagedTask(task: Task, user: User): boolean {
  if (isOwnEditableTask(task, user)) return true;
  return (
    user.role === 'MANAGER' &&
    task.assignedById === user.id &&
    EDITABLE_STATUSES.includes(task.status)
  );
}

export function canEdit(task: Task, user: User): boolean {
  return isManagedTask(task, user);
}

export function canDelete(task: Task, user: User): boolean {
  return isManagedTask(task, user);
}

export function canSubmit(task: Task, user: User): boolean {
  // soumettre est une transition de workflow : le statut compte même pour l'admin
  // (contrairement à éditer/supprimer, qui sont de la gestion de données)
  if (user.role === 'ADMINISTRATOR') return EDITABLE_STATUSES.includes(task.status);
  return isOwnEditableTask(task, user);
}

// un manager ne valide/rejette que les tâches qu'il a lui-même assignées au collaborateur
// concerné : ni les tâches auto-créées (non assignées), ni celles assignées par un autre
// manager ou par l'admin. L'admin, lui, peut tout valider.
function canReview(task: Task, user: User): boolean {
  if (task.status !== 'SUBMITTED') return false;
  if (user.role === 'ADMINISTRATOR') return true;
  if (user.role === 'MANAGER') return task.assignedById === user.id;
  return false;
}

export function canValidate(task: Task, user: User): boolean {
  return canReview(task, user);
}

export function canReject(task: Task, user: User): boolean {
  return canReview(task, user);
}
