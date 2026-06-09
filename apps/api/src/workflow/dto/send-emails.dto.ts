import { IsArray, IsString } from 'class-validator';

export class SendEmailsDto {
  @IsArray()
  @IsString({ each: true })
  draftIds: string[];

  @IsString()
  emailAccountId: string;
}
