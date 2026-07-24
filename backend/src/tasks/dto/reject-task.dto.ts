import { IsString, MinLength } from 'class-validator';

export class RejectTaskDto {
  @IsString()
  @MinLength(1)
  rejectionReason: string;
}
