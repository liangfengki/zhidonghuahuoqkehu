import { IsString, IsArray, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateCampaignDto {
  @IsString() name: string;
  @IsArray() @IsString({ each: true }) industryFilter: string[];
  @IsArray() @IsString({ each: true }) countryFilter: string[];
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() sequenceId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5000) dailyLimit?: number;
}
