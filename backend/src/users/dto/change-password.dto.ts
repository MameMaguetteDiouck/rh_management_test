import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  // 72 : bcrypt tronque silencieusement au-delà, cf. auth.service.ts
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  newPassword: string;
}
