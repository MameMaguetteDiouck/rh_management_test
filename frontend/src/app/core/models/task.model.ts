export type TaskStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface TaskAttribution {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason: string | null;
  creatorId: string;
  validatorId: string | null;
  assignedById: string | null;
  creator: TaskAttribution;
  validator: TaskAttribution | null;
  assignedBy: TaskAttribution | null;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  // Manager/admin uniquement : crée la tâche pour ce collaborateur plutôt que pour soi-même.
  creatorId?: string;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface RejectTaskPayload {
  rejectionReason: string;
}
