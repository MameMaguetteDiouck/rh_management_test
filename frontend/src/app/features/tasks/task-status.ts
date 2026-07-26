import { TaskStatus } from '../../core/models/task.model';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  APPROVED: 'Validée',
  REJECTED: 'Rejetée',
};

export const TASK_STATUS_BADGE_CLASSES: Record<TaskStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-brand-50 text-brand-700',
  REJECTED: 'bg-red-50 text-red-700',
};

export const TASK_STATUS_ACCENT_CLASSES: Record<TaskStatus, string> = {
  DRAFT: 'bg-slate-400',
  SUBMITTED: 'bg-blue-500',
  APPROVED: 'bg-brand-500',
  REJECTED: 'bg-red-500',
};

export const TASK_STATUS_BORDER_CLASSES: Record<TaskStatus, string> = {
  DRAFT: 'border-l-slate-400',
  SUBMITTED: 'border-l-blue-500',
  APPROVED: 'border-l-brand-500',
  REJECTED: 'border-l-red-500',
};
