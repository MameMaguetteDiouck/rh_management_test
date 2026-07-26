import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Role, TaskStatus } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';

function makeUser(role: Role, sub = 'user-1'): JwtPayload {
  return { sub, email: `${sub}@rh.local`, role, mustChangePassword: false };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Titre',
    description: 'Description',
    status: TaskStatus.DRAFT,
    creatorId: 'collab-1',
    validatorId: null,
    assignedById: null,
    rejectionReason: null,
    ...overrides,
  };
}

describe('TasksService', () => {
  let prisma: {
    task: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };
  let service: TasksService;

  beforeEach(() => {
    prisma = {
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };
    service = new TasksService(prisma as any);
  });

  describe('create', () => {
    it('crée la tâche pour soi-même par défaut', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-1');
      prisma.task.create.mockResolvedValue(makeTask());

      await service.create(collab, { title: 't', description: 'd' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ creatorId: 'collab-1', assignedById: null }),
        }),
      );
    });

    it('ignore creatorId envoyé par un collaborateur', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-1');
      prisma.task.create.mockResolvedValue(makeTask());

      await service.create(collab, { title: 't', description: 'd', creatorId: 'someone-else' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ creatorId: 'collab-1', assignedById: null }),
        }),
      );
    });

    it('permet à un manager d’assigner une tâche à un collaborateur', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.user.findUnique.mockResolvedValue({ id: 'collab-2', role: Role.COLLABORATOR });
      prisma.task.create.mockResolvedValue(makeTask());

      await service.create(manager, { title: 't', description: 'd', creatorId: 'collab-2' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ creatorId: 'collab-2', assignedById: 'manager-1' }),
        }),
      );
    });

    it('refuse d’assigner à quelqu’un qui n’est pas collaborateur', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.user.findUnique.mockResolvedValue({ id: 'other-manager', role: Role.MANAGER });

      await expect(
        service.create(manager, { title: 't', description: 'd', creatorId: 'other-manager' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('permet à un admin d’assigner une tâche à un manager', async () => {
      const admin = makeUser(Role.ADMINISTRATOR, 'admin-1');
      prisma.user.findUnique.mockResolvedValue({ id: 'manager-2', role: Role.MANAGER });
      prisma.task.create.mockResolvedValue(makeTask());

      await service.create(admin, { title: 't', description: 'd', creatorId: 'manager-2' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ creatorId: 'manager-2', assignedById: 'admin-1' }),
        }),
      );
    });

    it('permet à un admin d’assigner une tâche à un collaborateur', async () => {
      const admin = makeUser(Role.ADMINISTRATOR, 'admin-1');
      prisma.user.findUnique.mockResolvedValue({ id: 'collab-3', role: Role.COLLABORATOR });
      prisma.task.create.mockResolvedValue(makeTask());

      await service.create(admin, { title: 't', description: 'd', creatorId: 'collab-3' });

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ creatorId: 'collab-3', assignedById: 'admin-1' }),
        }),
      );
    });

    it('refuse d’assigner à un utilisateur introuvable', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(manager, { title: 't', description: 'd', creatorId: 'ghost' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update / remove (getManagedTask)', () => {
    it('autorise le créateur sur une tâche DRAFT', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-1');
      prisma.task.findUnique.mockResolvedValue(makeTask({ status: TaskStatus.DRAFT }));
      prisma.task.update.mockResolvedValue(makeTask());

      await expect(service.update('task-1', collab, { title: 'x' })).resolves.toBeDefined();
    });

    it('refuse le créateur sur une tâche APPROVED', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-1');
      prisma.task.findUnique.mockResolvedValue(makeTask({ status: TaskStatus.APPROVED }));

      await expect(service.update('task-1', collab, { title: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuse un collaborateur qui n’est pas le créateur', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-2');
      prisma.task.findUnique.mockResolvedValue(makeTask({ creatorId: 'collab-1' }));

      await expect(service.remove('task-1', collab)).rejects.toThrow(ForbiddenException);
    });

    it('autorise le manager qui a assigné la tâche', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.DRAFT, assignedById: 'manager-1' }),
      );
      prisma.task.delete.mockResolvedValue(undefined);

      await expect(service.remove('task-1', manager)).resolves.toBeUndefined();
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    });

    it('refuse un manager qui n’a pas assigné la tâche', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-2');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.DRAFT, assignedById: 'manager-1' }),
      );

      await expect(service.remove('task-1', manager)).rejects.toThrow(ForbiddenException);
    });

    it('l’admin peut agir même hors des statuts éditables', async () => {
      const admin = makeUser(Role.ADMINISTRATOR, 'admin-1');
      prisma.task.findUnique.mockResolvedValue(makeTask({ status: TaskStatus.APPROVED }));
      prisma.task.delete.mockResolvedValue(undefined);

      await expect(service.remove('task-1', admin)).resolves.toBeUndefined();
    });

    it('renvoie NotFoundException si la tâche n’existe pas', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(service.update('ghost', makeUser(Role.ADMINISTRATOR), {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('submit', () => {
    it('autorise le créateur à soumettre depuis DRAFT', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-1');
      prisma.task.findUnique.mockResolvedValue(makeTask({ status: TaskStatus.DRAFT }));
      prisma.task.update.mockResolvedValue(makeTask({ status: TaskStatus.SUBMITTED }));

      await service.submit('task-1', collab);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.SUBMITTED,
            rejectionReason: null,
            validatorId: null,
          }),
        }),
      );
    });

    it('refuse le manager assignateur (seul le créateur soumet)', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.DRAFT, assignedById: 'manager-1' }),
      );

      await expect(service.submit('task-1', manager)).rejects.toThrow(ForbiddenException);
    });

    it('refuse de soumettre une tâche déjà APPROVED', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-1');
      prisma.task.findUnique.mockResolvedValue(makeTask({ status: TaskStatus.APPROVED }));

      await expect(service.submit('task-1', collab)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validate / reject', () => {
    it('autorise le manager qui a assigné la tâche', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.SUBMITTED, assignedById: 'manager-1' }),
      );
      prisma.task.update.mockResolvedValue(makeTask({ status: TaskStatus.APPROVED }));

      await service.validate('task-1', manager);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: TaskStatus.APPROVED, validatorId: 'manager-1' }),
        }),
      );
    });

    it('refuse un manager sur une tâche non assignée (auto-créée)', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.SUBMITTED, assignedById: null }),
      );

      await expect(service.validate('task-1', manager)).rejects.toThrow(ForbiddenException);
    });

    it('refuse un manager sur une tâche assignée par un autre manager', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-2');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.SUBMITTED, assignedById: 'manager-1' }),
      );

      await expect(service.reject('task-1', manager, { rejectionReason: 'non' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuse un manager sur une tâche assignée par l’admin', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.SUBMITTED, assignedById: 'admin-1' }),
      );

      await expect(service.validate('task-1', manager)).rejects.toThrow(ForbiddenException);
    });

    it('l’admin peut valider n’importe quelle tâche soumise', async () => {
      const admin = makeUser(Role.ADMINISTRATOR, 'admin-1');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.SUBMITTED, assignedById: 'manager-1' }),
      );
      prisma.task.update.mockResolvedValue(makeTask({ status: TaskStatus.APPROVED }));

      await expect(service.validate('task-1', admin)).resolves.toBeDefined();
    });

    it('refuse de valider une tâche qui n’est pas SUBMITTED', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.task.findUnique.mockResolvedValue(
        makeTask({ status: TaskStatus.DRAFT, assignedById: 'manager-1' }),
      );

      await expect(service.validate('task-1', manager)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll (pagination)', () => {
    it('applique skip/take selon la page demandée', async () => {
      const admin = makeUser(Role.ADMINISTRATOR, 'admin-1');
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll(admin, { page: 2, pageSize: 10 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('restreint le collaborateur à ses propres tâches', async () => {
      const collab = makeUser(Role.COLLABORATOR, 'collab-1');
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll(collab, { page: 1, pageSize: 50 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { creatorId: 'collab-1' } }),
      );
    });

    it('inclut les propres tâches du manager (auto-créées ou assignées par l’admin)', async () => {
      const manager = makeUser(Role.MANAGER, 'manager-1');
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      await service.findAll(manager, { page: 1, pageSize: 50 });

      const { where } = prisma.task.findMany.mock.calls[0][0];
      expect(where.OR).toEqual(expect.arrayContaining([{ creatorId: 'manager-1' }]));
    });
  });
});
