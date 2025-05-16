import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MqttService implements OnModuleInit {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private errorLogPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Hata logları için klasör oluştur
    this.errorLogPath = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.errorLogPath)) {
      fs.mkdirSync(this.errorLogPath, { recursive: true });
    }
  }

  onModuleInit() {
    this.connectToMqttBroker();
  }

  private connectToMqttBroker() {
    // MQTT URL konfigürasyonu
    const useTls = this.configService.get<string>('MQTT_USE_TLS') === 'true';
    const mqttHost = this.configService.get<string>('MQTT_HOST') || 'localhost';
    const mqttPort = parseInt(this.configService.get<string>('MQTT_PORT') || (useTls ? '8883' : '1883'));
    const protocol = useTls ? 'mqtts' : 'mqtt';
    const mqttUrl = this.configService.get<string>('MQTT_URL') || `${protocol}://${mqttHost}:${mqttPort}`;
    
    // MQTT bağlantı opsiyonları
    const options: mqtt.IClientOptions = {
      clientId: `patrion-backend-${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    };

    // TLS/SSL konfigürasyonu
    if (useTls) {
      this.logger.log('Using TLS/SSL for MQTT connection');
      
      // Sertifika dosyaları yolları
      const certPath = path.join(process.cwd(), 'ssl', 'mqtt-broker.crt');
      const keyPath = path.join(process.cwd(), 'ssl', 'mqtt-broker.key');
      
      // Sertifika dosyalarının varlığını kontrol et
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        this.logger.error('SSL certificate or key file not found. Please generate SSL certificates first.');
        return;
      }
      
      // TLS/SSL opsiyonlarını ekle
      options.rejectUnauthorized = false; // Self-signed sertifikalar için false
      
      try {
        options.ca = [fs.readFileSync(certPath)];
        options.key = fs.readFileSync(keyPath);
        options.cert = fs.readFileSync(certPath);
      } catch (error) {
        this.logger.error(`Error reading SSL files: ${error.message}`, error.stack);
        return;
      }
    }

    this.client = mqtt.connect(mqttUrl, options);

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${mqttUrl} ${useTls ? 'with SSL/TLS' : ''}`);
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      this.logger.error(`MQTT connection error: ${error.message}`, error.stack);
    });

    this.client.on('message', (topic, message) => {
      this.logger.debug(`Received message on topic: ${topic}`);
      this.logger.debug(`Message: ${message.toString()}`);
      
      // Mesaj işleme burada yapılmaz, controller'da yapılır
    });
  }

  private subscribeToTopics() {
    // Sistem konularına abone ol
    this.client.subscribe('patrion/system/#', (err) => {
      if (!err) {
        this.logger.log('Subscribed to patrion/system/#');
      }
    });

    // Şirket konularına abone ol
    this.client.subscribe('patrion/companies/#', (err) => {
      if (!err) {
        this.logger.log('Subscribed to patrion/companies/#');
      }
    });

    // Sensör konularına abone ol
    this.client.subscribe('patrion/sensors/#', (err) => {
      if (!err) {
        this.logger.log('Subscribed to patrion/sensors/#');
      }
    });
  }

  /**
   * MQTT mesajı yayınla
   */
  publishMessage(topic: string, message: string | object): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    this.client.publish(topic, messageStr);
  }
  
  /**
   * Sensör veri hatalarını dinle ve logla
   */
  @OnEvent('sensor.data.error')
  handleSensorDataError(payload: { topic: string, data: any, error: string, timestamp: Date }) {
    this.logger.error(`Sensor data error: ${payload.error}`, {
      topic: payload.topic,
      data: payload.data
    });
    
    // Hata logu dosyasına yaz
    const timestamp = payload.timestamp.toISOString().replace(/:/g, '-');
    const logFileName = `sensor_error_${timestamp.split('T')[0]}.log`;
    const logFilePath = path.join(this.errorLogPath, logFileName);
    
    const logEntry = JSON.stringify({
      timestamp: payload.timestamp,
      topic: payload.topic,
      data: payload.data,
      error: payload.error
    }, null, 2);
    
    fs.appendFile(logFilePath, logEntry + '\n', (err) => {
      if (err) {
        this.logger.error(`Error writing to log file: ${err.message}`, err.stack);
      }
    });
  }

  /**
   * Şirketle ilgili bir olay yayınlar
   */
  publishCompanyEvent(companyId: string, event: string, data: any): void {
    const topic = `patrion/companies/${companyId}/${event}`;
    this.publishMessage(topic, data);
  }

  /**
   * Kullanıcıyla ilgili bir olay yayınlar
   */
  publishUserEvent(userId: string, event: string, data: any): void {
    const topic = `patrion/users/${userId}/${event}`;
    this.publishMessage(topic, data);
  }

  /**
   * Sistem genelinde bir olay yayınlar
   */
  publishSystemEvent(event: string, data: any): void {
    const topic = `patrion/system/${event}`;
    this.publishMessage(topic, data);
  }

  /**
   * Sensör verisi yayınlar (test için)
   */
  publishSensorData(sensorId: string, data: any): void {
    const topic = `patrion/sensors/${sensorId}`;
    this.publishMessage(topic, data);
  }

  /**
   * MQTT bağlantısını kapatır
   */
  onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.logger.log('MQTT connection closed');
    }
  }
} 