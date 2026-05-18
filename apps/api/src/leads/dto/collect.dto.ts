import { IsString, IsArray, IsOptional } from 'class-validator';

export class CollectDto {
  @IsString()
  industry: string;

  @IsString()
  country: string;

  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyDomains?: string[];
}
