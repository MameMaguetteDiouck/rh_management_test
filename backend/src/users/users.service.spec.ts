import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { Role } from '../../generated/prisma/client';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@rh.local',
    firstName: 'Prénom',
    lastName: 'Nom',
    password: 'hashed',
    role: Role.COLLABORATOR,
    createdAt: new Date(),
    updatedAt: new Date(),
    deactivatedAt: null,
    mustChangePassword: false,
    ...overrides,
  };
}

describe('UsersService', () => {
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    task: { deleteMany: jest.Mock; updateMany: jest.Mock };
    refreshToken: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      task: { deleteMany: jest.fn(), updateMany: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new UsersService(prisma as any);
  });

  describe('create', () => {
    it('hache le mot de passe avant de créer le compte', async () => {
      prisma.user.create.mockResolvedValue(makeUser());

      await service.create({
        firstName: 'A',
        lastName: 'B',
        email: 'a@rh.local',
        password: 'Password1',
        role: Role.COLLABORATOR,
      });

      const call = prisma.user.create.mock.calls[0][0];
      expect(call.data.password).not.toBe('Password1');
      expect(await bcrypt.compare('Password1', call.data.password)).toBe(true);
    });
  });

  describe('findAll (pagination)', () => {
    it('applique skip/take et renvoie le total', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser()]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 2, pageSize: 5 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
      expect(result).toEqual(
        expect.objectContaining({ total: 1, page: 2, pageSize: 5 }),
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('protection du dernier administrateur', () => {
    it('refuse de retirer le rôle admin du dernier administrateur actif', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ id: 'admin-1', role: Role.ADMINISTRATOR }),
      );
      prisma.user.count.mockResolvedValue(1);

      await expect(
        service.update('admin-1', { role: Role.MANAGER }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("autorise la démotion s'il reste un autre administrateur actif", async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ id: 'admin-1', role: Role.ADMINISTRATOR }),
      );
      prisma.user.count.mockResolvedValue(2);
      prisma.user.update.mockResolvedValue(makeUser({ role: Role.MANAGER }));

      await expect(service.update('admin-1', { role: Role.MANAGER })).resolves.toBeDefined();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('refuse de désactiver le dernier administrateur actif', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ id: 'admin-1', role: Role.ADMINISTRATOR }),
      );
      prisma.user.count.mockResolvedValue(1);

      await expect(service.deactivate('admin-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('n’impacte pas la mise à jour de champs sans changement de rôle', async () => {
      prisma.user.update.mockResolvedValue(makeUser({ firstName: 'Nouveau' }));

      await service.update('user-1', { firstName: 'Nouveau' });

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('n’impacte pas la désactivation d’un simple collaborateur', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ role: Role.COLLABORATOR }));
      prisma.user.update.mockResolvedValue(makeUser({ deactivatedAt: new Date() }));

      await expect(service.deactivate('user-1')).resolves.toBeDefined();
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('changeOwnPassword', () => {
    it('refuse si le mot de passe actuel est incorrect', async () => {
      const hashed = await bcrypt.hash('CorrectPassword1', 10);
      prisma.user.findUniqueOrThrow.mockResolvedValue(makeUser({ password: hashed }));

      await expect(
        service.changeOwnPassword('user-1', {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword1',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('met à jour le mot de passe et invalide les sessions si le mot de passe actuel est correct', async () => {
      const hashed = await bcrypt.hash('CorrectPassword1', 10);
      prisma.user.findUniqueOrThrow.mockResolvedValue(makeUser({ password: hashed }));
      prisma.user.update.mockResolvedValue(makeUser());

      await service.changeOwnPassword('user-1', {
        currentPassword: 'CorrectPassword1',
        newPassword: 'NewPassword1',
      });

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.mustChangePassword).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('force un changement de mot de passe à la prochaine connexion', async () => {
      prisma.user.update.mockResolvedValue(makeUser());

      await service.resetPassword('user-1', { newPassword: 'NewPassword1' });

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.mustChangePassword).toBe(true);
    });
  });

  describe('remove', () => {
    it('détache les tâches assignées/validées et supprime les tâches créées, en transaction', async () => {
      prisma.$transaction.mockResolvedValue(undefined);

      await service.remove('user-1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const operations = prisma.$transaction.mock.calls[0][0];
      expect(operations).toHaveLength(5);
    });
  });
});
