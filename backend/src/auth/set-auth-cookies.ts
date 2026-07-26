import type { Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants';

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const secure = process.env.NODE_ENV === 'production';

  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  });
}
