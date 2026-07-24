import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithUser } from '../types/request-with-user.interface';
import type { JwtPayload } from '../../auth/types/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
