import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RejectTaskDto } from './dto/reject-task.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { PaginatedResult } from '../common/types/paginated-result.interface';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';
import { Prisma, Role, TaskStatus } from '../../generated/prisma/client';

const EDITABLE_STATUSES: TaskStatus[] = [TaskStatus.DRAFT, TaskStatus.REJECTED];

// pour que le manager/admin voient qui a créé/assigné/validé une tâche sans requête à part
const TASK_ATTRIBUTION_INCLUDE = {
  creator: { select: { id: true, firstName: true, lastName: true } },
  assignedBy: { select: { id: true, firstName: true, lastName: true } },
  validator: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: JwtPayload, dto: CreateTaskDto) {
    const assignableRoles = this.getAssignableRoles(user.role);
    let creatorId = user.sub;
    let assignedById: string | null = null;

    if (assignableRoles.length > 0 && dto.creatorId) {
      const target = await this.prisma.user.findUnique({
        where: { id: dto.creatorId },
      });
      if (!target || !assignableRoles.includes(target.role)) {
        throw new NotFoundException('Destinataire introuvable');
      }
      creatorId = target.id;
      assignedById = user.sub;
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        creatorId,
        assignedById,
      },
      include: TASK_ATTRIBUTION_INCLUDE,
    });
  }

  // l'admin peut assigner à un manager ou un collaborateur ; un manager, uniquement à un collaborateur
  private getAssignableRoles(role: Role): Role[] {
    if (role === Role.ADMINISTRATOR) return [Role.COLLABORATOR, Role.MANAGER];
    if (role === Role.MANAGER) return [Role.COLLABORATOR];
    return [];
  }

  async findAll(
    user: JwtPayload,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const where = this.buildVisibilityFilter(user);
    const { page, pageSize } = pagination;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: TASK_ATTRIBUTION_INCLUDE,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  private buildVisibilityFilter(user: JwtPayload): Prisma.TaskWhereInput {
    if (user.role === Role.ADMINISTRATOR) {
      return {};
    }
    if (user.role === Role.MANAGER) {
      // le manager voit tout le pipeline (soumis + rejeté) plus ce qu'il a lui-même
      // validé ou assigné, même si le statut a changé depuis, ainsi que ses propres tâches
      // (auto-créées ou assignées par l'admin, l'admin pouvant aussi assigner à un manager)
      return {
        OR: [
          { status: TaskStatus.SUBMITTED },
          { status: TaskStatus.REJECTED },
          { validatorId: user.sub },
          { assignedById: user.sub },
          { creatorId: user.sub },
        ],
      };
    }
    return { creatorId: user.sub };
  }

  async findOne(id: string, user: JwtPayload) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: TASK_ATTRIBUTION_INCLUDE,
    });
    if (
      !task ||
      (user.role === Role.COLLABORATOR && task.creatorId !== user.sub)
    ) {
      throw new NotFoundException('Tâche introuvable');
    }
    return task;
  }

  async update(id: string, user: JwtPayload, dto: UpdateTaskDto) {
    const task = await this.getManagedTask(id, user);
    return this.prisma.task.update({
      where: { id: task.id },
      data: dto,
      include: TASK_ATTRIBUTION_INCLUDE,
    });
  }

  async remove(id: string, user: JwtPayload) {
    const task = await this.getManagedTask(id, user);
    await this.prisma.task.delete({ where: { id: task.id } });
  }

  async submit(id: string, user: JwtPayload) {
    const task = await this.getOwnEditableTask(id, user);
    // contrairement à update/remove, la règle de statut s'applique même à l'admin :
    // soumettre est une transition de workflow, pas une action de gestion de données
    if (!EDITABLE_STATUSES.includes(task.status)) {
      throw new ForbiddenException(
        'Cette tâche ne peut plus être modifiée dans son état actuel',
      );
    }
    // on efface l'ancien rejet, sinon il traînerait après la resoumission
    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.SUBMITTED,
        rejectionReason: null,
        validatorId: null,
      },
      include: TASK_ATTRIBUTION_INCLUDE,
    });
  }

  async validate(id: string, user: JwtPayload) {
    const task = await this.getSubmittedTask(id, user);
    return this.prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.APPROVED, validatorId: user.sub },
      include: TASK_ATTRIBUTION_INCLUDE,
    });
  }

  async reject(id: string, user: JwtPayload, dto: RejectTaskDto) {
    const task = await this.getSubmittedTask(id, user);
    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.REJECTED,
        validatorId: user.sub,
        rejectionReason: dto.rejectionReason,
      },
      include: TASK_ATTRIBUTION_INCLUDE,
    });
  }

  // soumettre reste réservé à la personne qui porte la tâche (créateur) ou à l'admin :
  // contrairement à update/remove, un manager assignateur ne soumet pas à la place du collaborateur
  private async getOwnEditableTask(id: string, user: JwtPayload) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }
    if (user.role !== Role.ADMINISTRATOR) {
      if (task.creatorId !== user.sub) {
        throw new ForbiddenException('Cette tâche ne vous appartient pas');
      }
      if (!EDITABLE_STATUSES.includes(task.status)) {
        throw new ForbiddenException(
          'Cette tâche ne peut plus être modifiée dans son état actuel',
        );
      }
    }
    return task;
  }

  // update/remove : en plus du créateur et de l'admin, le manager qui a lui-même
  // assigné la tâche peut aussi la corriger ou l'annuler
  private async getManagedTask(id: string, user: JwtPayload) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }
    if (user.role !== Role.ADMINISTRATOR) {
      const isOwner = task.creatorId === user.sub;
      const isAssigningManager =
        user.role === Role.MANAGER && task.assignedById === user.sub;
      if (!isOwner && !isAssigningManager) {
        throw new ForbiddenException('Cette tâche ne vous appartient pas');
      }
      if (!EDITABLE_STATUSES.includes(task.status)) {
        throw new ForbiddenException(
          'Cette tâche ne peut plus être modifiée dans son état actuel',
        );
      }
    }
    return task;
  }

  private async getSubmittedTask(id: string, user: JwtPayload) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }
    if (task.status !== TaskStatus.SUBMITTED) {
      throw new ForbiddenException(
        "Cette tâche n'est pas en attente de validation",
      );
    }
    // un manager ne valide/rejette que les tâches qu'il a lui-même assignées au collaborateur
    // concerné : ni les tâches auto-créées (non assignées), ni celles assignées par un autre
    // manager ou par l'admin. L'admin, lui, peut tout valider.
    if (user.role === Role.MANAGER && task.assignedById !== user.sub) {
      throw new ForbiddenException(
        'Vous ne pouvez valider ou rejeter que les tâches que vous avez vous-même assignées',
      );
    }
    return task;
  }
}
