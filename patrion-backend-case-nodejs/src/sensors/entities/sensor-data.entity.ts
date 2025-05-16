import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Sensor } from './sensor.entity';

@Entity('sensor_data')
export class SensorData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  sensor_id: string;

  @ManyToOne(() => Sensor, sensor => sensor.data, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sensor_id', referencedColumnName: 'sensor_id' })
  sensor: Sensor;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ type: 'float', nullable: true })
  temperature: number | null;

  @Column({ type: 'float', nullable: true })
  humidity: number | null;

  @Column({ type: 'jsonb', nullable: true })
  additional_data: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;
} 