import { IsString, MinLength, MaxLength } from 'class-validator';

export class RejectTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  rejectionReason: string;
}
