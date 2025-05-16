import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { SensorAccessLog } from './entities/sensor-access-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SensorAccessLog])],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {} 