import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MustChangePasswordGuard } from './must-change-password.guard';

function makeContext(
  user: Record<string, unknown> | undefined,
): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function makeReflector(skip: boolean): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(skip),
  } as unknown as Reflector;
}

describe('MustChangePasswordGuard', () => {
  it('laisse toujours passer les routes marquées @SkipPasswordCheck', () => {
    const guard = new MustChangePasswordGuard(makeReflector(true));
    expect(guard.canActivate(makeContext({ mustChangePassword: true }))).toBe(
      true,
    );
  });

  it('bloque si l’utilisateur doit changer son mot de passe', () => {
    const guard = new MustChangePasswordGuard(makeReflector(false));
    expect(() =>
      guard.canActivate(makeContext({ mustChangePassword: true })),
    ).toThrow(ForbiddenException);
  });

  it('laisse passer si le mot de passe est déjà à jour', () => {
    const guard = new MustChangePasswordGuard(makeReflector(false));
    expect(guard.canActivate(makeContext({ mustChangePassword: false }))).toBe(
      true,
    );
  });

  it('laisse passer sur une route publique où request.user n’existe pas encore', () => {
    const guard = new MustChangePasswordGuard(makeReflector(false));
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });
});
