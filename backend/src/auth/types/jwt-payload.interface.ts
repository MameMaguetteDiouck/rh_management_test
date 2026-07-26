import { Role } from '../../../generated/prisma/client';

// Ce qui est réellement signé dans l'access token.
export interface SignedJwtPayload {
  sub: string;
  email: string;
  role: Role;
}

// request.user après passage dans JwtStrategy. mustChangePassword n'est jamais signé dans le
// token, on le relit en base à chaque requête sinon un changement de statut met 15min à s'appliquer.
export interface JwtPayload extends SignedJwtPayload {
  mustChangePassword: boolean;
}
