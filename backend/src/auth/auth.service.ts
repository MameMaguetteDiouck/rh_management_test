import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.interface';
import { REFRESH_TOKEN_TTL_MS } from './auth.constants';

interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: JwtPayload['role'];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (user.deactivatedAt) {
      throw new UnauthorizedException(
        'Ce compte a été désactivé. Contactez un administrateur.',
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.issueTokens(user);
  }

  async refresh(rawRefreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(
        rawRefreshToken,
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash: this.hashToken(rawRefreshToken),
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token invalide ou déjà utilisé');
    }

    // Rotation : ce refresh token ne sert plus jamais après cet appel.
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });
    if (user.deactivatedAt) {
      throw new UnauthorizedException(
        'Ce compte a été désactivé. Contactez un administrateur.',
      );
    }
    return this.issueTokens(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      return;
    }
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash: this.hashToken(rawRefreshToken) },
    });
  }

  private async issueTokens(user: PublicUser & { password?: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRATION',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  // SHA-256, pas bcrypt : secret déjà à haute entropie (pas de brute-force à ralentir), et bcrypt tronque silencieusement au-delà de 72 octets.
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
