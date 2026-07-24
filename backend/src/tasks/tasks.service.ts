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

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(user: JwtPayload, dto: CreateTaskDto) {
    return this.prisma.task.create({ data: { ...dto, creatorId: user.sub } });
  }

  findAll(user: JwtPayload) {
    if (user.role === Role.ADMINISTRATOR) {
      return this.prisma.task.findMany({ orderBy: { updatedAt: 'desc' } });
    }

    if (user.role === Role.MANAGER) {
      return this.prisma.task.findMany({
        where: {
          OR: [{ status: TaskStatus.SUBMITTED }, { validatorId: user.sub }],
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return this.prisma.task.findMany({
      where: { creatorId: user.sub },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, user: JwtPayload) {
    const task = await this.prisma.task.findUnique({ where: { id } });
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
    return this.prisma.task.update({ where: { id: task.id }, data: dto });
  }

  async remove(id: string, user: JwtPayload) {
    const task = await this.getOwnEditableTask(id, user);
    await this.prisma.task.delete({ where: { id: task.id } });
  }

  async submit(id: string, user: JwtPayload) {
    const task = await this.getOwnEditableTask(id, user);
    // On repart d'un historique de validation vierge : une ancienne raison de rejet ne doit pas survivre à la resoumission.
    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.SUBMITTED,
        rejectionReason: null,
        validatorId: null,
      },
    });
  }

  async validate(id: string, user: JwtPayload) {
    const task = await this.getSubmittedTask(id);
    return this.prisma.task.update({
      where: { id: task.id },
      data: { status: TaskStatus.APPROVED, validatorId: user.sub },
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
    });
  }

  private async getOwnEditableTask(id: string, user: JwtPayload) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Tâche introuvable');
    }
    if (task.creatorId !== user.sub) {
      throw new ForbiddenException('Cette tâche ne vous appartient pas');
    }
    if (!EDITABLE_STATUSES.includes(task.status)) {
      throw new ForbiddenException(
        'Cette tâche ne peut plus être modifiée dans son état actuel',
      );
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
