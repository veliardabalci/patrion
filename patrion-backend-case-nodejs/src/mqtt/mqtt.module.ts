import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MqttController } from './mqtt.controller';
import { ConfigModule } from '@nestjs/config';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SensorsModule),
  ],
  controllers: [MqttController],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {} 