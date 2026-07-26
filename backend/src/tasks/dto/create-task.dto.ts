import { IsOptional, IsString, MinLength, IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  description: string;

  // ignoré si envoyé par un collaborateur, seuls manager/admin peuvent l'utiliser
  @IsOptional()
  @IsUUID()
  creatorId?: string;
}
