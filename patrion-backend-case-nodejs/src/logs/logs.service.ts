import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorAccessLog } from './entities/sensor-access-log.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(SensorAccessLog)
    private sensorAccessLogRepository: Repository<SensorAccessLog>,
  ) {}

  async createLog(userId: string, sensorId: string, action: string): Promise<SensorAccessLog> {
    const log = this.sensorAccessLogRepository.create({
      userId,
      sensorId,
      action,
    });
    
    return this.sensorAccessLogRepository.save(log);
  }

  async getAllLogs(): Promise<SensorAccessLog[]> {
    return this.sensorAccessLogRepository.find({
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }

  async getLogsByUser(userId: string): Promise<SensorAccessLog[]> {
    return this.sensorAccessLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
    });
  }

  async getLogsBySensor(sensorId: string): Promise<SensorAccessLog[]> {
    return this.sensorAccessLogRepository.find({
      where: { sensorId },
      relations: ['user'],
      order: { timestamp: 'DESC' },
    });
  }
} 