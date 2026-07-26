import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';
import type { RequestWithUser } from '../types/request-with-user.interface';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) {
      return true;
    }

    // sur les routes @Public() (login, refresh...) request.user n'existe pas encore, donc rien à faire
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user?.mustChangePassword) {
      throw new ForbiddenException(
        'Vous devez changer votre mot de passe avant de continuer.',
      );
    }
    return true;
  }
}
