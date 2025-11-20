import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StorePlatform } from '@prisma/client';

export class ConnectStoreDto {
  @IsEnum(StorePlatform)
  platform: StorePlatform;

  @IsString()
  name: string;

  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
