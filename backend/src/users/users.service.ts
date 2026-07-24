import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../../generated/prisma/client';

const SALT_ROUNDS = 10;

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deactivatedAt: user.deactivatedAt,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: { ...dto, password: await bcrypt.hash(dto.password, SALT_ROUNDS) },
    });
    return toPublicUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(toPublicUser);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return toPublicUser(user);
  }

  async deactivate(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
    // On coupe aussi les sessions déjà ouvertes : la désactivation doit être immédiate.
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    return toPublicUser(user);
  }

  async activate(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { deactivatedAt: null },
    });
    return toPublicUser(user);
  }

  async changeOwnPassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const matches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!matches) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    await this.setPassword(userId, dto.newPassword);
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    await this.setPassword(id, dto.newPassword);
  }

  private async setPassword(userId: string, newPassword: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(newPassword, SALT_ROUNDS) },
    });
    // Un changement de mot de passe invalide toutes les sessions ouvertes ailleurs.
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
