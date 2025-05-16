import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SensorData } from './entities/sensor-data.entity';
import { Sensor } from './entities/sensor.entity';
import { SensorUserAccess } from './entities/sensor-user.entity';
import { SensorDataDto } from './dto/sensor-data.dto';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorUserAccessDto, RemoveSensorUserAccessDto } from './dto/sensor-user-access.dto';
import { DEFAULT_THRESHOLDS, SensorStatus, SensorStatusLevel, SensorThresholds } from './dto/sensor-status.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class SensorsService {
  private readonly logger = new Logger(SensorsService.name);

  constructor(
    @InjectRepository(SensorData)
    private sensorDataRepository: Repository<SensorData>,
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
    @InjectRepository(SensorUserAccess)
    private sensorUserAccessRepository: Repository<SensorUserAccess>,
  ) {}

  /**
   * Sensör verilerine göre durum bilgisi hesaplar
   */
  calculateSensorStatus(temperature: number | null, humidity: number | null, thresholds: SensorThresholds = DEFAULT_THRESHOLDS): SensorStatus {
    // Varsayılan durum: UNKNOWN
    const status: SensorStatus = {
      level: SensorStatusLevel.UNKNOWN,
      message: 'Sensör durumu bilinmiyor'
    };

    // Sıcaklık durumu hesapla
    if (temperature !== null) {
      let tempLevel = SensorStatusLevel.NORMAL;
      let tempMessage = 'Sıcaklık normal aralıkta';

      if (temperature < thresholds.temperature.minWarning || temperature > thresholds.temperature.maxWarning) {
        tempLevel = SensorStatusLevel.ALERT;
        tempMessage = `Sıcaklık kritik seviyede: ${temperature}°C`;
      } else if (temperature < thresholds.temperature.minNormal || temperature > thresholds.temperature.maxNormal) {
        tempLevel = SensorStatusLevel.WARNING;
        tempMessage = `Sıcaklık normal aralığın dışında: ${temperature}°C`;
      }

      status.temperatureStatus = {
        level: tempLevel,
        message: tempMessage
      };
    }

    // Nem durumu hesapla
    if (humidity !== null) {
      let humLevel = SensorStatusLevel.NORMAL;
      let humMessage = 'Nem normal aralıkta';

      if (humidity < thresholds.humidity.minWarning || humidity > thresholds.humidity.maxWarning) {
        humLevel = SensorStatusLevel.ALERT;
        humMessage = `Nem kritik seviyede: %${humidity}`;
      } else if (humidity < thresholds.humidity.minNormal || humidity > thresholds.humidity.maxNormal) {
        humLevel = SensorStatusLevel.WARNING;
        humMessage = `Nem normal aralığın dışında: %${humidity}`;
      }

      status.humidityStatus = {
        level: humLevel,
        message: humMessage
      };
    }

    // Genel durum hesapla
    if (status.temperatureStatus && status.humidityStatus) {
      // Her iki değer de varsa
      if (status.temperatureStatus.level === SensorStatusLevel.ALERT || status.humidityStatus.level === SensorStatusLevel.ALERT) {
        status.level = SensorStatusLevel.ALERT;
        status.message = 'Kritik durum: Sıcaklık veya nem kritik seviyede!';
      } else if (status.temperatureStatus.level === SensorStatusLevel.WARNING || status.humidityStatus.level === SensorStatusLevel.WARNING) {
        status.level = SensorStatusLevel.WARNING;
        status.message = 'Uyarı: Sıcaklık veya nem normal aralığın dışında';
      } else {
        status.level = SensorStatusLevel.NORMAL;
        status.message = 'Tüm değerler normal aralıkta';
      }
    } else if (status.temperatureStatus) {
      // Sadece sıcaklık varsa
      status.level = status.temperatureStatus.level;
      status.message = status.temperatureStatus.message;
    } else if (status.humidityStatus) {
      // Sadece nem varsa
      status.level = status.humidityStatus.level;
      status.message = status.humidityStatus.message;
    }

    return status;
  }

  /**
   * Yeni bir sensör oluşturur
   */
  async createSensor(createSensorDto: CreateSensorDto): Promise<Sensor> {
    // Sensör ID'sinin benzersiz olduğunu kontrol et
    const existingSensor = await this.sensorRepository.findOne({
      where: { sensor_id: createSensorDto.sensor_id }
    });

    if (existingSensor) {
      throw new ConflictException(`Sensor with ID ${createSensorDto.sensor_id} already exists`);
    }

    const sensor = this.sensorRepository.create(createSensorDto);
    return await this.sensorRepository.save(sensor);
  }

  /**
   * Tüm sensörleri getirir
   */
  async findAllSensors(): Promise<Sensor[]> {
    return this.sensorRepository.find({
      relations: ['company']
    });
  }

  /**
   * Tüm sensörleri son verileriyle birlikte getirir
   */
  async findAllSensorsWithLatestData(): Promise<any[]> {
    const sensors = await this.findAllSensors();
    return this.enrichSensorsWithLatestData(sensors);
  }

  /**
   * Belirli bir şirkete ait sensörleri getirir
   */
  async findSensorsByCompany(companyId: string): Promise<Sensor[]> {
    return this.sensorRepository.find({
      where: { companyId },
      relations: ['company']
    });
  }

  /**
   * Belirli bir şirkete ait sensörleri son verileriyle birlikte getirir
   */
  async findSensorsByCompanyWithLatestData(companyId: string): Promise<any[]> {
    const sensors = await this.findSensorsByCompany(companyId);
    return this.enrichSensorsWithLatestData(sensors);
  }

  /**
   * Sensörlere son sıcaklık ve nem verilerini ekler
   */
  private async enrichSensorsWithLatestData(sensors: Sensor[]): Promise<any[]> {
    const enrichedSensors: any[] = [];
    
    for (const sensor of sensors) {
      // Her sensör için son veriyi al
      const latestData = await this.sensorDataRepository.findOne({
        where: { sensor_id: sensor.sensor_id },
        order: { timestamp: 'DESC' }
      });
      
      // Durum hesapla
      let status: SensorStatus | null = null;
      if (latestData) {
        status = this.calculateSensorStatus(latestData.temperature, latestData.humidity);
      }
      
      // Sensör verilerini birleştir
      const enrichedSensor = {
        ...sensor,
        latestData: latestData ? {
          timestamp: latestData.timestamp,
          temperature: latestData.temperature,
          humidity: latestData.humidity,
          additional_data: latestData.additional_data
        } : null,
        status: status
      };
      
      enrichedSensors.push(enrichedSensor);
    }
    
    return enrichedSensors;
  }

  /**
   * ID'ye göre sensör getirir
   */
  async findSensorById(id: string): Promise<Sensor> {
    const sensor = await this.sensorRepository.findOne({
      where: { id },
      relations: ['company']
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with ID ${id} not found`);
    }

    return sensor;
  }

  /**
   * ID'ye göre sensörü son verileriyle birlikte getirir
   */
  async findSensorByIdWithLatestData(id: string): Promise<any> {
    const sensor = await this.findSensorById(id);
    const latestData = await this.sensorDataRepository.findOne({
      where: { sensor_id: sensor.sensor_id },
      order: { timestamp: 'DESC' }
    });
    
    // Durum hesapla
    let status: SensorStatus | null = null;
    if (latestData) {
      status = this.calculateSensorStatus(latestData.temperature, latestData.humidity);
    }
    
    return {
      ...sensor,
      latestData: latestData ? {
        timestamp: latestData.timestamp,
        temperature: latestData.temperature,
        humidity: latestData.humidity,
        additional_data: latestData.additional_data
      } : null,
      status: status
    };
  }

  /**
   * Sensör ID'sine göre sensör getirir
   */
  async findSensorBySensorId(sensorId: string): Promise<Sensor> {
    const sensor = await this.sensorRepository.findOne({
      where: { sensor_id: sensorId },
      relations: ['company']
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor with sensor_id ${sensorId} not found`);
    }

    return sensor;
  }

  /**
   * Sensörü günceller
   */
  async updateSensor(id: string, updateSensorDto: UpdateSensorDto): Promise<Sensor> {
    const sensor = await this.findSensorById(id);
    
    // Sensörü güncelle
    Object.assign(sensor, updateSensorDto);
    return await this.sensorRepository.save(sensor);
  }

  /**
   * Sensörü siler
   */
  async removeSensor(id: string): Promise<void> {
    const sensor = await this.findSensorById(id);
    await this.sensorRepository.remove(sensor);
  }

  /**
   * MQTT'den gelen sensör verisini kaydeder
   */
  async saveSensorData(sensorDataDto: SensorDataDto): Promise<SensorData> {
    this.logger.log(`Saving sensor data from sensor: ${sensorDataDto.sensor_id}`);
    
    try {
      // Unix timestamp'i Date'e çevir
      const timestampDate = new Date(sensorDataDto.timestamp * 1000);
      
      // Temel verileri çıkart
      const { sensor_id, temperature, humidity, timestamp, ...rest } = sensorDataDto;
      
      // additional_data için geri kalan tüm alanları birleştir
      const additionalData = Object.keys(rest).length > 0 ? rest : null;
      
      // Yeni sensör verisi oluştur
      const sensorData = new SensorData();
      sensorData.sensor_id = sensor_id;
      sensorData.timestamp = timestampDate;
      sensorData.temperature = temperature ?? null;
      sensorData.humidity = humidity ?? null;
      sensorData.additional_data = additionalData;
      
      // Veritabanına kaydet
      return await this.sensorDataRepository.save(sensorData);
    } catch (error) {
      this.logger.error(`Error saving sensor data: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Belirli bir sensör için son verileri getirir
   */
  async getLatestDataForSensor(sensorId: string, limit: number = 10): Promise<SensorData[]> {
    return this.sensorDataRepository.find({
      where: { sensor_id: sensorId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Tüm sensör ID'lerinin listesini getirir
   */
  async getAllSensors(): Promise<string[]> {
    const result = await this.sensorDataRepository
      .createQueryBuilder('sensor_data')
      .select('DISTINCT sensor_data.sensor_id', 'sensor_id')
      .getRawMany();
    
    return result.map(item => item.sensor_id);
  }

  /**
   * Belirli bir zaman aralığında sensör verilerini getirir
   */
  async getSensorDataInTimeRange(
    sensorId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<SensorData[]> {
    return this.sensorDataRepository.find({
      where: {
        sensor_id: sensorId,
        timestamp: Between(startTime, endTime),
      },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Kullanıcıya sensör erişim izni ekler
   */
  async addSensorUserAccess(accessDto: SensorUserAccessDto, currentUser: User): Promise<SensorUserAccess> {
    // Sensörün var olup olmadığını kontrol et
    const sensor = await this.sensorRepository.findOne({
      where: { id: accessDto.sensorId },
      relations: ['company'],
    });

    if (!sensor) {
      throw new NotFoundException(`Sensör bulunamadı: ${accessDto.sensorId}`);
    }

    // Erişim eklenecek kullanıcıyı kontrol et
    const existingAccess = await this.sensorUserAccessRepository.findOne({
      where: {
        sensorId: accessDto.sensorId,
        userId: accessDto.userId,
      },
    });

    if (existingAccess) {
      throw new ConflictException('Bu kullanıcı için bu sensöre zaten erişim tanımlanmış');
    }

    // Yetki kontrolü yap
    // 1. Sistem yöneticileri her sensör için erişim tanımlayabilir
    // 2. Şirket yöneticileri sadece kendi şirketlerinin sensörlerine erişim tanımlayabilir
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      if (currentUser.role === UserRole.COMPANY_ADMIN && sensor.companyId !== currentUser.companyId) {
        throw new ForbiddenException('Başka bir şirkete ait sensöre erişim tanımlayamazsınız');
      } else if (currentUser.role === UserRole.USER) {
        throw new ForbiddenException('Kullanıcıların sensöre erişim tanımlama yetkisi yoktur');
      }
    }

    // Yeni erişim kaydı oluştur
    const newAccess = this.sensorUserAccessRepository.create({
      ...accessDto,
      createdBy: currentUser.id,
    });

    return await this.sensorUserAccessRepository.save(newAccess);
  }

  /**
   * Kullanıcının sensör erişim iznini kaldırır
   */
  async removeSensorUserAccess(removeDto: RemoveSensorUserAccessDto, currentUser: User): Promise<void> {
    // Sensörün var olup olmadığını kontrol et
    const sensor = await this.sensorRepository.findOne({
      where: { id: removeDto.sensorId },
      relations: ['company'],
    });

    if (!sensor) {
      throw new NotFoundException(`Sensör bulunamadı: ${removeDto.sensorId}`);
    }

    // Erişim kaydını kontrol et
    const access = await this.sensorUserAccessRepository.findOne({
      where: {
        sensorId: removeDto.sensorId,
        userId: removeDto.userId,
      },
    });

    if (!access) {
      throw new NotFoundException('Bu kullanıcı için bu sensöre tanımlanmış erişim bulunamadı');
    }

    // Yetki kontrolü yap
    // 1. Sistem yöneticileri her erişimi kaldırabilir
    // 2. Şirket yöneticileri sadece kendi şirketlerinin sensörlerine ait erişimleri kaldırabilir
    // 3. Kullanıcılar sadece kendi erişimlerini kaldırabilir
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      if (currentUser.role === UserRole.COMPANY_ADMIN && sensor.companyId !== currentUser.companyId) {
        throw new ForbiddenException('Başka bir şirkete ait sensörün erişimini kaldıramazsınız');
      } else if (currentUser.role === UserRole.USER && removeDto.userId !== currentUser.id) {
        throw new ForbiddenException('Sadece kendi erişim izninizi kaldırabilirsiniz');
      }
    }

    // Erişimi kaldır
    await this.sensorUserAccessRepository.remove(access);
  }

  /**
   * Bir kullanıcının tüm sensör erişimlerini listeler
   */
  async getUserSensorAccesses(userId: string): Promise<SensorUserAccess[]> {
    return this.sensorUserAccessRepository.find({
      where: { userId },
      relations: ['sensor', 'user'],
    });
  }

  /**
   * Bir sensöre erişimi olan tüm kullanıcıları listeler
   */
  async getSensorUserAccesses(sensorId: string): Promise<SensorUserAccess[]> {
    return this.sensorUserAccessRepository.find({
      where: { sensorId },
      relations: ['sensor', 'user'],
    });
  }

  /**
   * Kullanıcının bir sensöre erişim iznini kontrol eder
   */
  async checkUserSensorAccess(userId: string, sensorId: string, requiredPermission: 'view' | 'edit' | 'delete' = 'view'): Promise<boolean> {
    const access = await this.sensorUserAccessRepository.findOne({
      where: { userId, sensorId },
    });

    if (!access) {
      return false;
    }

    switch (requiredPermission) {
      case 'view':
        return access.canView;
      case 'edit':
        return access.canEdit;
      case 'delete':
        return access.canDelete;
      default:
        return false;
    }
  }
} 