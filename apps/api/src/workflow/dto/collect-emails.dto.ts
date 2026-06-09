import { IsString, IsArray, IsOptional } from 'class-validator';

export class CollectEmailsDto {
  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyDomains?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  urls?: string[];
}
