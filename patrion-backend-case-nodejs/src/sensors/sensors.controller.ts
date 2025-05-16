import { 
  Controller, 
  Get, 
  Post,
  Put,
  Delete,
  Body,
  Param, 
  Query, 
  ParseIntPipe, 
  UseGuards,
  Req,
  ForbiddenException
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { SensorUserAccessDto, RemoveSensorUserAccessDto } from './dto/sensor-user-access.dto';

@Controller('sensors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  // Sensör yönetimi endpointleri
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  createSensor(@Body() createSensorDto: CreateSensorDto, @Req() req) {
    // CompanyAdmin ise, kendi şirketine sensör ekleyebilir
    if (req.user.role === UserRole.COMPANY_ADMIN && req.user.companyId) {
      createSensorDto.companyId = req.user.companyId;
    }
    return this.sensorsService.createSensor(createSensorDto);
  }

  @Get('registry')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN, UserRole.USER)
  async getAllSensorRegistry(@Req() req) {
    const user = req.user;
    
    // SystemAdmin için tüm sensörleri getir
    if (user.role === UserRole.SYSTEM_ADMIN) {
      return this.sensorsService.findAllSensorsWithLatestData();
    }
    
    // CompanyAdmin veya normal kullanıcılar için, önce kendi şirketlerinin sensörlerini al
    let sensors: any[] = [];
    
    if (user.companyId) {
      sensors = await this.sensorsService.findSensorsByCompanyWithLatestData(user.companyId);
    }
    
    // Kullanıcıların özel erişim izinlerini kontrol et
    const userAccesses = await this.sensorsService.getUserSensorAccesses(user.id);
    
    // Erişim izni olan sensörleri ekle
    for (const access of userAccesses) {
      // Sadece 'view' izni olanları ekle
      if (access.canView) {
        // Sensör şirket dışı bir sensör ise ve henüz listeye eklenmemiş ise
        if (!user.companyId || access.sensor?.companyId !== user.companyId) {
          // Sensör detaylarını al
          const sensor = await this.sensorsService.findSensorByIdWithLatestData(access.sensorId);
          
          // Şirket dışı sensör var mi diye kontrol et
          if (sensor && !sensors.some(s => s.id === sensor.id)) {
            sensors.push(sensor);
          }
        }
      }
    }
    
    return sensors;
  }

  @Get('registry/:id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN, UserRole.USER)
  async getSensorById(@Param('id') id: string, @Req() req) {
    const user = req.user;
    const sensor = await this.sensorsService.findSensorById(id);
    
    // Erişim kontrolü
    let hasAccess = false;
    
    // SystemAdmin her sensöre erişebilir
    if (user.role === UserRole.SYSTEM_ADMIN) {
      hasAccess = true;
    }
    // CompanyAdmin kendi şirketinin sensörlerine erişebilir
    else if (user.role === UserRole.COMPANY_ADMIN && sensor.companyId === user.companyId) {
      hasAccess = true;
    }
    // Diğer kullanıcılar kendi şirket sensörlerine ve özel izin verilen sensörlere erişebilir
    else {
      // Kendi şirketinin sensörü mü?
      if (sensor.companyId === user.companyId) {
        hasAccess = true;
      } else {
        // Özel erişim izni var mı?
        hasAccess = await this.sensorsService.checkUserSensorAccess(user.id, id, 'view');
      }
    }
    
    if (!hasAccess) {
      throw new ForbiddenException('Bu sensöre erişim izniniz bulunmamaktadır');
    }
    
    return this.sensorsService.findSensorByIdWithLatestData(id);
  }

  @Put('registry/:id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  updateSensor(
    @Param('id') id: string, 
    @Body() updateSensorDto: UpdateSensorDto,
    @Req() req
  ) {
    return this.sensorsService.updateSensor(id, updateSensorDto);
  }

  @Delete('registry/:id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  removeSensor(@Param('id') id: string, @Req() req) {
    return this.sensorsService.removeSensor(id);
  }

  // Sensör verisi endpointleri
  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  async getAllSensors() {
    return {
      sensors: await this.sensorsService.getAllSensors()
    };
  }

  @Get(':sensorId/latest')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN, UserRole.USER)
  getLatestData(
    @Param('sensorId') sensorId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.sensorsService.getLatestDataForSensor(sensorId, limit || 10);
  }

  @Get(':sensorId/range')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN, UserRole.USER)
  getSensorDataInRange(
    @Param('sensorId') sensorId: string,
    @Query('start') startTimestamp: string,
    @Query('end') endTimestamp: string,
  ) {
    const startDate = new Date(parseInt(startTimestamp) * 1000);
    const endDate = new Date(parseInt(endTimestamp) * 1000);
    
    return this.sensorsService.getSensorDataInTimeRange(sensorId, startDate, endDate);
  }

  // Kullanıcı erişim yönetimi endpointleri
  @Post('access')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  addSensorUserAccess(@Body() accessDto: SensorUserAccessDto, @Req() req) {
    return this.sensorsService.addSensorUserAccess(accessDto, req.user);
  }

  @Delete('access')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN, UserRole.USER)
  removeSensorUserAccess(@Body() removeDto: RemoveSensorUserAccessDto, @Req() req) {
    return this.sensorsService.removeSensorUserAccess(removeDto, req.user);
  }

  @Get('access/user/:userId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  getUserSensorAccesses(@Param('userId') userId: string) {
    return this.sensorsService.getUserSensorAccesses(userId);
  }

  @Get('access/sensor/:sensorId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  getSensorUserAccesses(@Param('sensorId') sensorId: string) {
    return this.sensorsService.getSensorUserAccesses(sensorId);
  }

  @Get('access/check/:sensorId/:userId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  checkUserSensorAccess(
    @Param('sensorId') sensorId: string,
    @Param('userId') userId: string,
    @Query('permission') permission: 'view' | 'edit' | 'delete' = 'view',
  ) {
    return this.sensorsService.checkUserSensorAccess(userId, sensorId, permission);
  }

  @Get('my-access')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN, UserRole.USER)
  getMyAccessibleSensors(@Req() req) {
    return this.sensorsService.getUserSensorAccesses(req.user.id);
  }
} 