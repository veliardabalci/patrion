import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SensorsService } from './sensors.service';
import { Interval } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { SensorData } from './entities/sensor-data.entity';
import { Sensor } from './entities/sensor.entity';
import { JwtService } from '@nestjs/jwt';
import { SocketJwtMiddleware } from '../auth/socket-jwt.middlewate';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { LogsService } from '../logs/logs.service';

interface EnrichedSensor extends Sensor {
  latestData?: any;
  status?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'sensors',
})
export class SensorsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SensorsGateway.name);
  private connectedClients = 0;
  private clientSubscriptions = new Map<string, string[]>(); // client.id -> [sensor_id]

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sensorsService: SensorsService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly logsService: LogsService
  ) {}

  afterInit(server: Server) {
    const jwtMiddleware = new SocketJwtMiddleware(this.jwtService, this.usersService);
    server.use((socket, next) => jwtMiddleware.use(socket as Socket, next));
    this.logger.log('WebSocket Gateway initialized with JWT middleware');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`Client connected: ${client.id}, Total clients: ${this.connectedClients}`);
    
    // Bağlantı kurulduğunda mevcut sensör verilerini gönder
    this.sendInitialData(client);
    
    // Yeni bağlanan istemci için abonelik kaydı oluştur
    this.clientSubscriptions.set(client.id, []);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`Client disconnected: ${client.id}, Total clients: ${this.connectedClients}`);
    
    // İstemci ayrıldığında aboneliklerini temizle
    this.clientSubscriptions.delete(client.id);
  }

  // Kullanıcının bir sensöre erişim iznini kontrol eden merkezi metod
  private async checkSensorAccess(user: User, sensorId: string, sensorObj?: Sensor): Promise<boolean> {
    try {
      // Eğer sensör nesnesi sağlanmadıysa, sensör bilgisini getir
      const sensor = sensorObj || await this.sensorsService.findSensorById(sensorId);
      
      // SystemAdmin her sensöre erişebilir
      if (user.role === UserRole.SYSTEM_ADMIN) {
        return true;
      }
      
      // CompanyAdmin kendi şirketinin sensörlerine erişebilir
      if (user.role === UserRole.COMPANY_ADMIN && sensor.companyId === user.companyId) {
        return true;
      }
      
      // Normal kullanıcılar için kontroller
      // 1. Kendi şirketlerinin sensörlerine erişebilirler
      if (user.companyId && sensor.companyId === user.companyId) {
        return true;
      }
      
      // 2. Özel erişim izni verilmiş sensörlere erişebilirler (canView kontrolü)
      const hasAccess = await this.sensorsService.checkUserSensorAccess(user.id, sensor.id, 'view');
      return hasAccess;
      
    } catch (error) {
      this.logger.error(`Error checking sensor access: ${error.message}`, error.stack);
      return false;
    }
  }

  // Yeni bir sensör verisi geldiğinde tetiklenir
  @OnEvent('sensor.data.received')
  async handleSensorDataReceived(sensorData: SensorData) {
    // Yeni sensör verisi geldiğinde tüm sensör verilerini güncelle ve yayınla
    if (this.connectedClients > 0) {
      this.logger.log(`New sensor data received for ${sensorData.sensor_id}, broadcasting to clients`);
      
      // Tüm sensörlere abone olan istemcilere genel güncelleme yayını
      await this.broadcastSensorData();
      
      // Belirli sensöre abone olan istemcilere özel güncelleme yayını
      await this.broadcastSingleSensorData(sensorData.sensor_id);
    }
  }

  // Belirli bir sensöre abone ol
  @SubscribeMessage('subscribe-sensor')
  async handleSubscribeSensor(client: Socket, sensorId: string) {
    try {
      const user = client.data?.user;
      if (!user) {
        return { success: false, message: 'Authentication required' };
      }
      
      // Sensör bilgisini al
      try {
        const sensor = await this.sensorsService.findSensorBySensorId(sensorId);
        
        // Yetki kontrolü - merkezi metodu kullan
        const hasAccess = await this.checkSensorAccess(user, sensor.id, sensor);
        
        if (!hasAccess) {
          return { success: false, message: 'Bu sensöre erişim izniniz bulunmamaktadır' };
        }
        
      } catch (error) {
        this.logger.warn(`Sensor not found: ${sensorId}, subscription will be rejected`);
        return { success: false, message: 'Sensör bulunamadı' };
      }
      
      // İstemcinin aboneliklerini al veya yeni bir liste oluştur
      const subscriptions = this.clientSubscriptions.get(client.id) || [];
      
      // Eğer zaten abone değilse ekle
      if (!subscriptions.includes(sensorId)) {
        subscriptions.push(sensorId);
        this.clientSubscriptions.set(client.id, subscriptions);
      }
      
      this.logger.log(`Client ${client.id} (${user.email}) subscribed to sensor ${sensorId}`);
      
      // Log the subscription
      await this.logsService.createLog(user.id, sensorId, 'subscribed_to_sensor');
      
      // Abone olduğu sensörün en son verilerini gönder
      const latestData = await this.sensorsService.getLatestDataForSensor(sensorId, 1);
      if (latestData && latestData.length > 0) {
        client.emit(`sensor-data-${sensorId}`, latestData[0]);
      }
      
      return { success: true, message: `Subscribed to sensor ${sensorId}` };
    } catch (error) {
      this.logger.error(`Error subscribing to sensor: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  // Belirli bir sensörün aboneliğini iptal et
  @SubscribeMessage('unsubscribe-sensor')
  handleUnsubscribeSensor(client: Socket, sensorId: string) {
    try {
      // İstemcinin aboneliklerini al
      const subscriptions = this.clientSubscriptions.get(client.id);
      
      if (subscriptions) {
        // Abonelikten çıkar
        const index = subscriptions.indexOf(sensorId);
        if (index !== -1) {
          subscriptions.splice(index, 1);
          this.clientSubscriptions.set(client.id, subscriptions);
        }
      }
      
      this.logger.log(`Client ${client.id} unsubscribed from sensor ${sensorId}`);
      return { success: true, message: `Unsubscribed from sensor ${sensorId}` };
    } catch (error) {
      this.logger.error(`Error unsubscribing from sensor: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  // Belirli bir sensörün son verilerini getir
  @SubscribeMessage('get-sensor-data')
  async handleGetSensorData(client: Socket, payload: { sensorId: string, limit?: number }) {
    try {
      const user = client.data.user;
      const sensor = await this.sensorsService.findSensorByIdWithLatestData(payload.sensorId);
      
      // Yetki kontrolü - merkezi metodu kullan
      const hasAccess = await this.checkSensorAccess(user, sensor.id, sensor);
      
      if (!hasAccess) {
        return { success: false, message: 'Bu sensöre erişim izniniz bulunmamaktadır' };
      }

      // Log the data access
      await this.logsService.createLog(user.id, payload.sensorId, 'viewed_logs');
  
      const data = await this.sensorsService.getLatestDataForSensor(payload.sensorId, payload.limit || 10);
      return { success: true, data };
    } catch (error) {
      this.logger.error(`Error retrieving sensor data: ${error.message}`, error.stack);
      return { success: false, message: error.message };
    }
  }

  // Bağlantı kurulduğunda mevcut sensör verilerini gönder
  private async sendInitialData(client: Socket) {
    try {
      const user = client.data.user;
      let sensors: EnrichedSensor[] = [];

      if (user.role === UserRole.SYSTEM_ADMIN) {
        // Sistem yöneticileri tüm sensörleri görebilir
        sensors = await this.sensorsService.findAllSensorsWithLatestData();
      } else if (user.role === UserRole.COMPANY_ADMIN && user.companyId) {
        // Şirket yöneticileri kendi şirketlerinin sensörlerini görebilir
        sensors = await this.sensorsService.findSensorsByCompanyWithLatestData(user.companyId);
        
        // Şirket yöneticileri için özel erişim izinlerini de kontrol et
        const userAccesses = await this.sensorsService.getUserSensorAccesses(user.id);
        for (const access of userAccesses) {
          if (access.canView && access.sensor.companyId !== user.companyId) {
            const sensor = await this.sensorsService.findSensorByIdWithLatestData(access.sensorId);
            if (sensor) {
              sensors.push(sensor);
            }
          }
        }
      } else if (user.companyId) {
        // Normal kullanıcılar kendi şirketlerinin sensörlerini görebilir
        sensors = await this.sensorsService.findSensorsByCompanyWithLatestData(user.companyId);
        
        // Ayrıca özel erişim izni verilen sensörleri de ekleyelim
        const userAccesses = await this.sensorsService.getUserSensorAccesses(user.id);
        
        // Şirket dışı sensörleri bul ve ekle
        for (const access of userAccesses) {
          if (access.canView) {
            const sensor = await this.sensorsService.findSensorByIdWithLatestData(access.sensorId);
            if (sensor && sensor.companyId !== user.companyId) {
              sensors.push(sensor);
            }
          }
        }
      } else {
        // Şirketle ilişkisi olmayan kullanıcılar sadece özel erişim izni olan sensörleri görebilir
        const userAccesses = await this.sensorsService.getUserSensorAccesses(user.id);
        
        for (const access of userAccesses) {
          if (access.canView) {
            const sensor = await this.sensorsService.findSensorByIdWithLatestData(access.sensorId);
            if (sensor) {
              sensors.push(sensor);
            }
          }
        }
      }

      client.emit('sensors-registry', sensors);
      this.logger.log(`Initial sensor data sent to client ${client.id} for role ${user.role}`);
    } catch (error) {
      this.logger.error(`Error sending initial sensor data: ${error.message}`, error.stack);
    }
  }

  // Her 5 saniyede bir sensör verilerini yayınla
  @Interval(5000)
  async broadcastSensorData() {
    // Eğer bağlı istemci yoksa işlem yapma
    if (this.connectedClients === 0) {
      return;
    }

    try {
      // Tüm duyarlı istemcilere rol tabanlı veri gönder
      const sockets = await this.server.fetchSockets();
      
      // Tüm sensör verilerini al - sadece bir kez
      const allSensors: EnrichedSensor[] = await this.sensorsService.findAllSensorsWithLatestData();
      
      for (const socket of sockets) {
        try {
          const user = socket.data?.user;
          if (!user) continue; // Kimliği doğrulanmamış istemcileri atla
          
          let userSensors: EnrichedSensor[] = [];
          
          if (user.role === UserRole.SYSTEM_ADMIN) {
            // Sistem yöneticileri tüm sensörleri görebilir
            userSensors = [...allSensors];
          } else {
            // Diğer kullanıcılar için (CompanyAdmin dahil)
            
            // 1. Önce kendi şirketine ait sensörleri ekle
            if (user.companyId) {
              userSensors = allSensors.filter(s => s.companyId === user.companyId);
            }
            
            // 2. Sonra özel erişim izinlerini kontrol et
            const userAccesses = await this.sensorsService.getUserSensorAccesses(user.id);
            
            // Erişim izni olan sensörleri ekle (canView kontrolü)
            for (const access of userAccesses) {
              if (access.canView) {
                const sensor = allSensors.find(s => s.id === access.sensorId);
                // Şirket dışı sensörleri ekle veya zaten eklenmemişse ekle
                if (sensor && (!user.companyId || sensor.companyId !== user.companyId)) {
                  // Bu sensör zaten listeye eklendi mi kontrol et
                  if (!userSensors.some(s => s.id === sensor.id)) {
                    userSensors.push(sensor);
                  }
                }
              }
            }
          }
          
          // Kullanıcıya uygun sensör verilerini gönder
          socket.emit('sensors-update', userSensors);
        } catch (error) {
          this.logger.error(`Error sending data to client: ${error.message}`, error.stack);
        }
      }
    } catch (error) {
      this.logger.error(`Error broadcasting sensor data: ${error.message}`, error.stack);
    }
  }

  // Belirli bir sensör için veriyi yayınla
  private async broadcastSingleSensorData(sensorId: string) {
    try {
      // İlgili sensörün son verisini al
      const latestData = await this.sensorsService.getLatestDataForSensor(sensorId, 1);
      if (!latestData || latestData.length === 0) {
        return;
      }
      
      // Sensör bilgisini al
      const sensor = await this.sensorsService.findSensorBySensorId(sensorId);
      
      // Bu sensöre abone olan tüm istemcilere veriyi gönder
      const sockets = await this.server.fetchSockets();
      
      for (const socket of sockets) {
        // Abonelik listesini kontrol et
        const subscriptions = this.clientSubscriptions.get(socket.id);
        if (!subscriptions || !subscriptions.includes(sensorId)) {
          continue; // Bu sensöre abone değilse atla
        }
        
        // Yetki kontrolü - merkezi metodu kullan
        const user = socket.data?.user;
        if (!user) continue;
        
        const hasAccess = await this.checkSensorAccess(user, sensor.id, sensor);
        
        if (hasAccess) {
          socket.emit(`sensor-data-${sensorId}`, latestData[0]);
        } else {
          // Erişim izni kaldırıldıysa aboneliği iptal et
          const index = subscriptions.indexOf(sensorId);
          if (index !== -1) {
            subscriptions.splice(index, 1);
            this.clientSubscriptions.set(socket.id, subscriptions);
            socket.emit('subscription-revoked', { 
              sensorId, 
              message: 'Sensör erişim izniniz kaldırıldı. Abonelik iptal edildi.' 
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error broadcasting single sensor data: ${error.message}`, error.stack);
    }
  }
} 