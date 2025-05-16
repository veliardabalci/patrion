import { Controller, Logger, NotFoundException, Inject } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Ctx, MqttContext } from '@nestjs/microservices';
import { SensorsService } from '../sensors/sensors.service';
import { SensorDataDto } from '../sensors/dto/sensor-data.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Controller()
export class MqttController {
  private readonly logger = new Logger(MqttController.name);

  constructor(
    private readonly mqttService: MqttService,
    private readonly sensorsService: SensorsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Şirket olaylarını dinle
   */
  @MessagePattern('patrion/companies/+/+')
  handleCompanyEvents(@Payload() data: any, @Ctx() context: MqttContext) {
    const topic = context.getTopic();
    this.logger.log(`Received company event: ${topic}`);
    
    // Örnek: 'patrion/companies/companyId/created' topic'ini parçala
    const [, , companyId, eventType] = topic.split('/');
    
    this.logger.log(`Company: ${companyId}, Event: ${eventType}, Data:`, data);
    
    // Burada company ile ilgili olayı işleyebilirsiniz
    return { success: true, companyId, eventType };
  }

  /**
   * Sistem olaylarını dinle
   */
  @MessagePattern('patrion/system/+')
  handleSystemEvents(@Payload() data: any, @Ctx() context: MqttContext) {
    const topic = context.getTopic();
    this.logger.log(`Received system event: ${topic}`);
    
    // Örnek: 'patrion/system/health' topic'ini parçala
    const [, , eventType] = topic.split('/');
    
    this.logger.log(`System event: ${eventType}, Data:`, data);
    
    // Burada sistem olayını işleyebilirsiniz
    return { success: true, eventType };
  }

  /**
   * Sensör verilerini dinle ve kaydet
   */
  @MessagePattern('patrion/sensors/+')
  async handleSensorData(@Payload() data: any, @Ctx() context: MqttContext) {
    const topic = context.getTopic();
    this.logger.log(`Received sensor data: ${topic}`);
    
    try {
      // Veri formatını kontrol et
      if (!this.isValidSensorDataFormat(data)) {
        const errorMessage = `Invalid sensor data format: ${JSON.stringify(data)}`;
        this.logger.error(errorMessage);
        this.eventEmitter.emit('sensor.data.error', { 
          topic, 
          data, 
          error: 'Invalid data format',
          timestamp: new Date()
        });
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Sensör verilerini doğrula
      const sensorDataDto = await this.validateSensorData(data);
      
      // Sensörün kayıtlı olup olmadığını kontrol et
      try {
        // Kayıtlı sensör bilgilerini al
        const sensor = await this.sensorsService.findSensorBySensorId(sensorDataDto.sensor_id);
        
        // Sensör aktif değilse veriyi reddet
        if (!sensor.isActive) {
          this.logger.warn(`Sensor ${sensorDataDto.sensor_id} is inactive, but data will still be saved`);
        }
        this.logger.log(`Received data from registered sensor ${sensorDataDto.sensor_id} belonging to company ${sensor.companyId}`);
      } catch (error) {
        if (error instanceof NotFoundException) {
          this.logger.warn(`Received data from unregistered sensor: ${sensorDataDto.sensor_id}. Data will be saved anyway.`);
        }
      }
      
      // Veritabanına kaydet (her durumda)
      const savedData = await this.sensorsService.saveSensorData(sensorDataDto);
      
      this.logger.log(`Sensor data saved successfully for ${sensorDataDto.sensor_id}`);
      
      // Sensör verisi olayını tetikle
      this.eventEmitter.emit('sensor.data.received', savedData);
      
      return {
        success: true,
        id: savedData.id,
        sensor_id: savedData.sensor_id,
      };
    } catch (error) {
      this.logger.error(`Error processing sensor data: ${error.message}`, error.stack);
      
      // Hatalı veriyi logla
      this.eventEmitter.emit('sensor.data.error', { 
        topic, 
        data, 
        error: error.message,
        timestamp: new Date()
      });
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Veri formatının doğru olup olmadığını kontrol eder
   * Gerekli alanların varlığını ve tiplerini kontrol eder
   */
  private isValidSensorDataFormat(data: any): boolean {
    // Null veya undefined kontrolü
    if (!data) {
      return false;
    }
    
    // Obje olup olmadığını kontrol et
    if (typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }
    
    // Gerekli alanların varlığını kontrol et
    if (!('sensor_id' in data) || !('timestamp' in data)) {
      return false;
    }
    
    // sensor_id string olmalı
    if (typeof data.sensor_id !== 'string' || data.sensor_id.trim() === '') {
      return false;
    }
    
    // timestamp sayı olmalı veya sayıya çevrilebilmeli
    if (typeof data.timestamp !== 'number' && isNaN(Number(data.timestamp))) {
      return false;
    }
    
    // Sıcaklık ve nem değerleri varsa, sayı olmalı veya sayıya çevrilebilmeli
    if ('temperature' in data && 
        (typeof data.temperature !== 'number' && isNaN(Number(data.temperature)))) {
      return false;
    }
    
    if ('humidity' in data && 
        (typeof data.humidity !== 'number' && isNaN(Number(data.humidity)))) {
      return false;
    }
    
    return true;
  }

  /**
   * Sensör verilerini doğrular ve DTO'ya dönüştürür
   */
  private async validateSensorData(data: any): Promise<SensorDataDto> {
    this.logger.debug('Validating sensor data:', data);
    
    // Class-validator ile doğrulama
    const sensorDataDto = plainToClass(SensorDataDto, {
      sensor_id: data.sensor_id,
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : Number(data.timestamp),
      temperature: data.temperature !== undefined ? 
        (typeof data.temperature === 'number' ? data.temperature : Number(data.temperature)) : 
        undefined,
      humidity: data.humidity !== undefined ? 
        (typeof data.humidity === 'number' ? data.humidity : Number(data.humidity)) : 
        undefined,
      additional_data: Object.keys(data)
        .filter(key => !['sensor_id', 'timestamp', 'temperature', 'humidity'].includes(key))
        .reduce((obj, key) => {
          obj[key] = data[key];
          return obj;
        }, {})
    });
    
    // Class-validator ile doğrulama
    const errors = await validate(sensorDataDto);
    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');
      
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    return sensorDataDto;
  }
} 