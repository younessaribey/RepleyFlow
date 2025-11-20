import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  deliveryPartnerEnabled?: boolean;

  @IsOptional()
  @IsString()
  deliveryPartnerApiKey?: string;

  @IsOptional()
  @IsString()
  deliveryPartnerWebhookUrl?: string;
}
