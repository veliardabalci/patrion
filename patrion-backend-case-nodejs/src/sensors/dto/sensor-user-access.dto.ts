import { IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';

export class SensorUserAccessDto {
  @IsUUID()
  @IsNotEmpty()
  sensorId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsBoolean()
  @IsOptional()
  canView: boolean = true;

  @IsBoolean()
  @IsOptional()
  canEdit: boolean = false;

  @IsBoolean()
  @IsOptional()
  canDelete: boolean = false;

  @IsString()
  @IsOptional()
  description?: string;
}

export class RemoveSensorUserAccessDto {
  @IsUUID()
  @IsNotEmpty()
  sensorId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;
} 