import { IsArray, IsString, IsOptional } from 'class-validator';

export class GenerateEmailsDto {
  @IsArray()
  @IsString({ each: true })
  contactIds: string[];

  @IsOptional()
  @IsString()
  templateId?: string;
}
