export type TaskStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

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
}

export interface CreateTaskPayload {
  title: string;
  description: string;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export interface RejectTaskPayload {
  rejectionReason: string;
}
