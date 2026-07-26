import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload.interface';
import { ACCESS_COOKIE_NAME } from '../auth.constants';

function cookieExtractor(req: Request): string | null {
  return (req.cookies?.[ACCESS_COOKIE_NAME] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Cookie httpOnly en priorité (jamais lu par le JS du frontend) ; header Authorization en repli pour Postman/curl.
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(
    payload: Omit<JwtPayload, 'mustChangePassword'>,
  ): Promise<JwtPayload> {
    // requête en base à chaque appel, pas juste au login, sinon désactiver un compte
    // ne prend effet qu'à l'expiration du token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { deactivatedAt: true, mustChangePassword: true },
    });
    if (!user || user.deactivatedAt) {
      throw new UnauthorizedException('Compte désactivé');
    }
    return { ...payload, mustChangePassword: user.mustChangePassword };
  }
}
