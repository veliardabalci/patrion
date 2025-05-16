import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';
import { SensorData } from './entities/sensor-data.entity';
import { Sensor } from './entities/sensor.entity';
import { SensorUserAccess } from './entities/sensor-user.entity';
import { MqttModule } from '../mqtt/mqtt.module';
import { CompaniesModule } from '../companies/companies.module';
import { SensorsGateway } from './sensors.gateway';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensorData, Sensor, SensorUserAccess]),
    forwardRef(() => MqttModule),
    forwardRef(() => CompaniesModule),
    UsersModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    forwardRef(() => AuthModule),
    LogsModule,
  ],
  controllers: [SensorsController],
  providers: [SensorsService, SensorsGateway],
  exports: [SensorsService],
})
export class SensorsModule {} 