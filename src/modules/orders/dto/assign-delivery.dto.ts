import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AssignDeliveryDto {
  @IsOptional()
  @IsBoolean()
  immediate?: boolean = true;

  @IsOptional()
  @IsString()
  partner?: string;
}
