import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipPasswordCheck } from '../common/decorators/skip-password-check.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.interface';
import { AuthService } from '../auth/auth.service';
import { setAuthCookies } from '../auth/set-auth-cookies';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Roles(Role.ADMINISTRATOR)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // manager en a besoin pour la liste des collaborateurs à assigner
  @Roles(Role.MANAGER, Role.ADMINISTRATOR)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // attention à l'ordre : avant ':id/password' sinon "me" matche :id
  @SkipPasswordCheck()
  @Patch('me/password')
  async changeOwnPassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updated = await this.usersService.changeOwnPassword(user.sub, dto);
    // changer son propre mot de passe invalide aussi le refresh token de la session en
    // cours (setPassword les supprime tous) : on en réémet un tout de suite pour éviter
    // que l'utilisateur soit déconnecté juste après avoir changé son mot de passe.
    const { accessToken, refreshToken } = await this.authService.issueTokens(updated);
    setAuthCookies(res, accessToken, refreshToken);
    return updated;
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id/password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Roles(Role.ADMINISTRATOR)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    if (id === user.sub) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte.');
    }
    return this.usersService.remove(id);
  }
}
