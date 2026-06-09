import { IsString, IsOptional } from 'class-validator';

export class UpdateDraftDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
