import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Sensor } from './sensor.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Kullanıcılarla sensörler arasındaki erişim ilişkisini tanımlar
 * Bu entity sayesinde, kullanıcıların kendi şirketlerinin dışındaki sensörlere de erişim tanımlanabilir
 */
@Entity('sensor_user_access')
export class SensorUserAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Sensör referansı
  @ManyToOne(() => Sensor, sensor => sensor.userAccesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensor;

  @Column()
  sensorId: string;

  // Kullanıcı referansı
  @ManyToOne(() => User, user => user.sensorAccesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  // Kullanıcıya tanınan izin türleri
  @Column({ default: true })
  canView: boolean;

  @Column({ default: false })
  canEdit: boolean;

  @Column({ default: false })
  canDelete: boolean;

  // Erişim tanımlandığında oluşan açıklama
  @Column({ nullable: true })
  description: string;

  // Oluşturma ve güncelleme zaman damgaları
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Erişimi ekleyen kullanıcı (opsiyonel)
  @Column({ nullable: true })
  createdBy: string;
} 