import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma/client';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName: string;

  @IsEmail()
  @MaxLength(180)
  email: string;

  // 72 : bcrypt tronque silencieusement au-delà, cf. auth.service.ts
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @IsEnum(Role)
  role: Role;
}
