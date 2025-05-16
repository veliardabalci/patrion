import { Controller, Get, Param, UseGuards, Req, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  getAllLogs() {
    return this.logsService.getAllLogs();
  }

  @Get('sensor/:sensorId')
  @Roles(UserRole.SYSTEM_ADMIN)
  getLogsBySensor(@Param('sensorId') sensorId: string) {
    return this.logsService.getLogsBySensor(sensorId);
  }

  @Get('user/:userId')
  @Roles(UserRole.SYSTEM_ADMIN)
  getLogsByUser(@Param('userId') userId: string) {
    return this.logsService.getLogsByUser(userId);
  }
} 