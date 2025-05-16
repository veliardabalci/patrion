import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { SensorData } from './sensor-data.entity';
import { SensorUserAccess } from './sensor-user.entity';

@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sensor_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  type: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: false })
  companyId: string;

  @ManyToOne(() => Company, company => company.sensors)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @OneToMany(() => SensorData, sensorData => sensorData.sensor)
  data: SensorData[];

  @OneToMany(() => SensorUserAccess, sensorUserAccess => sensorUserAccess.sensor)
  userAccesses: SensorUserAccess[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 