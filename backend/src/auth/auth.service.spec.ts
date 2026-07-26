import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from '../../generated/prisma/client';

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@rh.local',
    password: 'hashed',
    firstName: 'A',
    lastName: 'B',
    role: Role.COLLABORATOR,
    mustChangePassword: false,
    deactivatedAt: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: {
    user: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
    refreshToken: {
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { get: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      refreshToken: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) =>
        ({
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRATION: '7d',
        })[key],
      ),
    };
    service = new AuthService(prisma as any, jwtService as any, config as any);
  });

  describe('login', () => {
    it('refuse un email inconnu', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'ghost@rh.local', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('refuse un compte désactivé', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ deactivatedAt: new Date() }));
      await expect(
        service.login({ email: 'user@rh.local', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('refuse un mauvais mot de passe', async () => {
      const hashed = await bcrypt.hash('CorrectPassword1', 10);
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hashed }));
      await expect(
        service.login({ email: 'user@rh.local', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('émet des tokens et enregistre le refresh token pour des identifiants valides', async () => {
      const hashed = await bcrypt.hash('CorrectPassword1', 10);
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hashed }));
      prisma.refreshToken.create.mockResolvedValue(undefined);

      const result = await service.login({
        email: 'user@rh.local',
        password: 'CorrectPassword1',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(result.user).toEqual(
        expect.objectContaining({ id: 'user-1', email: 'user@rh.local' }),
      );
    });
  });

  describe('refresh', () => {
    it('refuse un token dont la signature est invalide', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('refuse un token qui n’est plus en base (déjà consommé par la rotation)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('refuse si le compte a été désactivé depuis', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-1' });
      prisma.refreshToken.delete.mockResolvedValue(undefined);
      prisma.user.findUniqueOrThrow.mockResolvedValue(makeUser({ deactivatedAt: new Date() }));
      await expect(service.refresh('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('effectue la rotation : supprime l’ancien token et en émet un nouveau', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-1' });
      prisma.refreshToken.delete.mockResolvedValue(undefined);
      prisma.user.findUniqueOrThrow.mockResolvedValue(makeUser());
      prisma.refreshToken.create.mockResolvedValue(undefined);

      await service.refresh('some-token');

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('ne fait rien sans refresh token', async () => {
      await service.logout(undefined);
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('supprime le(s) refresh token(s) correspondant au token fourni', async () => {
      await service.logout('some-token');
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
