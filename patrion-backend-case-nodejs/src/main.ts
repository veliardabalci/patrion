import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { UsersService } from './users/users.service';
import { UserRole } from './users/entities/user.entity';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  
  // MQTT Mikroservisi için TLS/SSL ayarları
  const useTls = process.env.MQTT_USE_TLS === 'true';
  const mqttHost = process.env.MQTT_HOST || 'localhost';
  const mqttPort = parseInt(process.env.MQTT_PORT || (useTls ? '8883' : '1883'));
  const protocol = useTls ? 'mqtts' : 'mqtt';
  const url = `${protocol}://${mqttHost}:${mqttPort}`;
  
  // MQTT bağlantı opsiyonları
  const mqttOptions: any = {
    url: url,
    clientId: 'patrion-microservice-' + Math.random().toString(16).substring(2, 8),
  };
  
  // TLS/SSL konfigürasyonu
  if (useTls) {
    console.log('Using TLS/SSL for MQTT microservice');
    
    const sslDir = path.join(process.cwd(), 'ssl');
    const certPath = path.join(sslDir, 'mqtt-broker.crt');
    const keyPath = path.join(sslDir, 'mqtt-broker.key');
    
    // Sertifika dosyalarının varlığını kontrol et
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      // Self-signed sertifikalar için rejectUnauthorized false olmalı
      mqttOptions.rejectUnauthorized = false;
      mqttOptions.ca = [fs.readFileSync(certPath)];
      mqttOptions.key = fs.readFileSync(keyPath);
      mqttOptions.cert = fs.readFileSync(certPath);

      // Transport options için ayrıca SSL ayarlarını ekle
      mqttOptions.ssl = true;
      mqttOptions.protocol = 'mqtts';
    } else {
      console.error('SSL certificate or key files not found at:', sslDir);
    }
  }
  
  console.log('MQTT connection options:', mqttOptions);
  
  // MQTT Mikroservisini ekle
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: mqttOptions,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Rate limit ekle - dakikada maksimum 100 istek
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, please try again later in ${context.after}`,
        limit: context.max
      };
    }
  });
  
  // CORS ayarlarını genişlet
  await app.register(fastifyCors, {
    origin: true, // Tüm kaynaklara izin ver (geliştirme için)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
    maxAge: 86400 // 1 gün
  });
  
  // SystemAdmin kontrolü
  await initSystemAdmin(app);
  
  // Mikroservisleri başlat
  await app.startAllMicroservices();
  
  // HTTP sunucusunu başlat
  await app.listen(process.env.PORT || 3001, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}

async function initSystemAdmin(app: NestFastifyApplication) {
  const usersService = app.get(UsersService);
  
  try {
    // SystemAdmin var mı kontrol et
    const adminExists = await usersService.checkSystemAdminExists();
    
    if (!adminExists) {
      // SystemAdmin yoksa oluştur
      const admin = await usersService.createSystemAdmin({
        email: 'admin@example.com',
        firstName: 'System',
        lastName: 'Admin',
        password: 'admin123'
      });
      console.log('SystemAdmin created successfully:', admin.email);
    } else {
      console.log('SystemAdmin already exists');
    }
  } catch (error) {
    console.error('Error initializing SystemAdmin:', error);
  }
}

bootstrap();
