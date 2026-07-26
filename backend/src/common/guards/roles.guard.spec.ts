import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../../generated/prisma/client';

function makeContext(role: Role): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { role } }),
    }),
  } as unknown as ExecutionContext;
}

function makeReflector(returnValue: Role[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(returnValue) } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('autorise si aucun rôle n’est requis sur la route', () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext(Role.COLLABORATOR))).toBe(true);
  });

  it('autorise si aucun rôle n’est requis (tableau vide)', () => {
    const guard = new RolesGuard(makeReflector([]));
    expect(guard.canActivate(makeContext(Role.COLLABORATOR))).toBe(true);
  });

  it('autorise si le rôle de l’utilisateur fait partie des rôles requis', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMINISTRATOR, Role.MANAGER]));
    expect(guard.canActivate(makeContext(Role.MANAGER))).toBe(true);
  });

  it('refuse si le rôle de l’utilisateur n’est pas autorisé', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMINISTRATOR]));
    expect(guard.canActivate(makeContext(Role.COLLABORATOR))).toBe(false);
  });
});
