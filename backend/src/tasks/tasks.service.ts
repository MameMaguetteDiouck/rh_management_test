import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RejectTaskDto } from './dto/reject-task.dto';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';
import { Role, TaskStatus } from '../../generated/prisma/client';

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
    const isReviewer = user.role === Role.MANAGER || user.role === Role.ADMINISTRATOR;
    let creatorId = user.sub;
    let assignedById: string | null = null;

    if (isReviewer && dto.creatorId) {
      const target = await this.prisma.user.findUnique({
        where: { id: dto.creatorId },
      });
      if (!target || target.role !== Role.COLLABORATOR) {
        throw new NotFoundException('Collaborateur introuvable');
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

  findAll(user: JwtPayload) {
    if (user.role === Role.ADMINISTRATOR) {
      return this.prisma.task.findMany({
        orderBy: { updatedAt: 'desc' },
        include: TASK_ATTRIBUTION_INCLUDE,
      });
    }

    if (user.role === Role.MANAGER) {
      // le manager voit tout le pipeline (soumis + rejeté) plus ce qu'il a lui-même
      // validé ou assigné, même si le statut a changé depuis
      return this.prisma.task.findMany({
        where: {
          OR: [
            { status: TaskStatus.SUBMITTED },
            { status: TaskStatus.REJECTED },
            { validatorId: user.sub },
            { assignedById: user.sub },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        include: TASK_ATTRIBUTION_INCLUDE,
      });
    }

    return this.prisma.task.findMany({
      where: { creatorId: user.sub },
      orderBy: { updatedAt: 'desc' },
      include: TASK_ATTRIBUTION_INCLUDE,
    });
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
    const task = await this.getOwnEditableTask(id, user);
    return this.prisma.task.update({
      where: { id: task.id },
      data: dto,
      include: TASK_ATTRIBUTION_INCLUDE,
    });
  }

  async remove(id: string, user: JwtPayload) {
    const task = await this.getOwnEditableTask(id, user);
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
    const task = await this.getSubmittedTask(id);
    return this.prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.APPROVED, validatorId: user.sub },
      include: TASK_ATTRIBUTION_INCLUDE,
    });
  }

  async reject(id: string, user: JwtPayload, dto: RejectTaskDto) {
    const task = await this.getSubmittedTask(id);
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

  private async getSubmittedTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }
    if (task.status !== TaskStatus.SUBMITTED) {
      throw new ForbiddenException(
        "Cette tâche n'est pas en attente de validation",
      );
    }
    return task;
  }
}
