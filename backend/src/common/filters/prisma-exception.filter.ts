import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

const PRISMA_ERROR_MAP: Record<
  string,
  { status: number; error: string; message: string }
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Cette valeur est déjà utilisée.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    message: 'Ressource introuvable.',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Suppression impossible : des données liées existent encore.',
  },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = PRISMA_ERROR_MAP[exception.code];

    if (!mapped) {
      // code Prisma non mappé : sans ce log, l'erreur réelle disparaît derrière le 500
      // générique renvoyé au client, invisible depuis les logs du conteneur.
      this.logger.error(
        `Code Prisma non mappé : ${exception.code} — ${exception.message}`,
        exception.stack,
      );
    }

    const resolved = mapped ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Erreur serveur inattendue.',
    };

    response.status(resolved.status).json({
      statusCode: resolved.status,
      error: resolved.error,
      message: resolved.message,
    });
  }
}
