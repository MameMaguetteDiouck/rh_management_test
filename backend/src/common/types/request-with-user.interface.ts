import type { Request } from 'express';
import type { JwtPayload } from '../../auth/types/jwt-payload.interface';

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
