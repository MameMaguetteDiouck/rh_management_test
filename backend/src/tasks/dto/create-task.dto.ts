import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;

  // ignoré si envoyé par un collaborateur, seuls manager/admin peuvent l'utiliser
  @IsOptional()
  @IsUUID()
  creatorId?: string;
}
