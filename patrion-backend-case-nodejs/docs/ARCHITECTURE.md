# Mimari Tasarım Dokümantasyonu

Bu döküman, Patrion IoT sensör izleme platformunun mimari tasarım prensiplerini, bileşenlerini ve aralarındaki ilişkileri açıklar.

## Sistem Mimarisi Genel Bakış

Sistem aşağıdaki ana bileşenlerden oluşmaktadır:

```
┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │
│   HTTP API Layer  │     │   WebSocket API   │
│   (NestJS/Fastify)│     │   (Socket.IO)     │
│                   │     │                   │
└─────────┬─────────┘     └─────────┬─────────┘
          │                         │
          ▼                         ▼
┌───────────────────────────────────────────────┐
│                                               │
│            Business Logic Layer               │
│         (Service & Controller Layer)          │
│                                               │
└───────────────────┬───────────────────────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
┌─────────────────┐   ┌───────────────────┐
│                 │   │                   │
│  Data Access    │   │    MQTT Service   │
│  Layer (TypeORM)│   │                   │
│                 │   │                   │
└────────┬────────┘   └─────────┬─────────┘
         │                      │
         ▼                      ▼
┌────────────────┐      ┌───────────────────┐
│                │      │                   │
│   PostgreSQL   │      │ MQTT Broker       │
│   Database     │      │ (Mosquitto)       │
│                │      │                   │
└────────────────┘      └───────────────────┘
```

## Veri Modeli

Sistemdeki temel veri modeli bileşenleri ve ilişkileri:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│              │      │              │      │              │
│    Company   │◄────►│     User     │      │    Sensor    │
│              │1    *│              │      │              │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │    ▲                │
       │                     │    │                │
       │                     │    │                │
       │                     ▼    │                │
       │               ┌──────────────┐            │
       │               │              │            │
       └─────────────►│SensorUserAccess◄───────────┘
                      │              │
                      └──────────────┘
                             ▲
                             │
                             │
                      ┌──────────────┐
                      │              │
                      │  SensorData  │
                      │              │
                      └──────────────┘
```

## WebSocket Mimarisi

Patrion IoT platformu, gerçek zamanlı sensör verisi akışı için Socket.IO tabanlı bir WebSocket API kullanır. Bu mimari aşağıdaki bileşenlerden oluşur:

```
┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │
│  Client WebSocket │◄────┤  Socket.IO Server │
│  Connection       │     │  (NestJS Gateway) │
│                   │     │                   │
└───────────────────┘     └─────────┬─────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │                   │
                          │  MQTT Subscriber  │
                          │                   │
                          └─────────┬─────────┘
                                    │
                                    ▼
                          ┌───────────────────┐
                          │                   │
                          │  MQTT Broker      │
                          │                   │
                          └───────────────────┘
```

### İletişim Akışı

1. İstemci JWT token ile WebSocket bağlantısı kurar
2. Bağlantı kimlik doğrulaması yapılır
3. İstemci sensör(ler)e abone olur
4. Sensörlerden gelen veriler MQTT aracılığıyla alınır
5. Veriler sadece yetkili abonelere iletilir

## JWT ile WebSocket Kimlik Doğrulama

WebSocket bağlantıları JSON Web Token (JWT) kullanılarak güvence altına alınır. Bu, kullanıcının kimliğini doğrulamak ve yetkilendirme kontrollerini uygulamak için kullanılır.


### Ana Veri Modelleri

#### User Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @ManyToOne(() => Company, company => company.users, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ nullable: true })
  companyId: string;

  @OneToMany(() => SensorUserAccess, access => access.user)
  sensorAccesses: SensorUserAccess[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### Sensor Entity

```typescript
@Entity('sensors')
export class Sensor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sensorId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  type: string;

  @ManyToOne(() => Company, company => company.sensors)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column()
  companyId: string;

  @OneToMany(() => SensorData, data => data.sensor)
  data: SensorData[];

  @OneToMany(() => SensorUserAccess, access => access.sensor)
  userAccesses: SensorUserAccess[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### SensorUserAccess Entity

```typescript
@Entity('sensor_user_access')
export class SensorUserAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sensor, sensor => sensor.userAccesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensor;

  @Column()
  sensorId: string;

  @ManyToOne(() => User, user => user.sensorAccesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: true })
  canView: boolean;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;
}
```

### Kimlik Doğrulama (Authentication)

JWT (JSON Web Token) tabanlı kimlik doğrulama sistemi:

- `/auth/login` üzerinden kullanıcı girişi
- Access ve Refresh token stratejisi
- Token'da rol ve yetki bilgisi

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // ...
  }
}
```

###  WebSocket Güvenliği

Socket.IO bağlantıları için JWT token doğrulama middleware:

```typescript
export class SocketJwtMiddleware {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async use(client: Socket, next: (err?: Error) => void) {
    try {
      const token = client.handshake.auth.token || 
                    client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      client.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: ' + error.message));
    }
  }
}
```




### Rate Limiting

Fastify rate-limit ile dakikada 100 istek sınırlaması:

```typescript
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
```
