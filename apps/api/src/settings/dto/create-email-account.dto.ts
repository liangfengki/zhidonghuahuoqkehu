import { IsBoolean, IsEmail, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SmtpConfigDto {
  @IsString()
  host: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  user: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;
}

export class ImapConfigDto {
  @IsString()
  host: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  user: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  tls?: boolean;
}

export class CreateEmailAccountDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmtpConfigDto)
  smtpConfig?: SmtpConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ImapConfigDto)
  imapConfig?: ImapConfigDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dailyLimit?: number;
}
