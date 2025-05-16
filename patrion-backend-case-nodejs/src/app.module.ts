import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { AuthModule } from './auth/auth.module';
import { TokenBlacklistMiddleware } from './auth/middlewares/token-blacklist.middleware';
import { HealthModule } from './health/health.module';
import { MqttModule } from './mqtt/mqtt.module';
import { SensorsModule } from './sensors/sensors.module';
import { LogsModule } from './logs/logs.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'patrion_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    EventEmitterModule.forRoot(),
    UsersModule,
    CompaniesModule,
    AuthModule,
    HealthModule,
    MqttModule,
    SensorsModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TokenBlacklistMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'ping', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
        { path: 'health/*path', method: RequestMethod.ALL }
      )
      .forRoutes('*');
  }
}
