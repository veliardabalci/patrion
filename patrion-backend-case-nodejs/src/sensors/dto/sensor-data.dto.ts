import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class SensorDataDto {
  @IsString()
  sensor_id: string;

  @IsNumber()
  timestamp: number;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  humidity?: number;

  @IsObject()
  @IsOptional()
  additional_data?: Record<string, any>;
} 