import { IsOptional, IsString } from 'class-validator';

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  whatsappPhoneNumberId?: string;

  @IsOptional()
  @IsString()
  whatsappBusinessId?: string;

  @IsOptional()
  @IsString()
  whatsappTemplateName?: string;

  @IsOptional()
  @IsString()
  whatsappTemplateLanguage?: string;
}
