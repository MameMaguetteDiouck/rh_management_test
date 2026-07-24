import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.interface';
import { ACCESS_COOKIE_NAME } from '../auth.constants';

function cookieExtractor(req: Request): string | null {
  return (req.cookies?.[ACCESS_COOKIE_NAME] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
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

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
