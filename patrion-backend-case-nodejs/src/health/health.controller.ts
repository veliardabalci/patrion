import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheckService, 
  HealthCheck, 
  TypeOrmHealthIndicator,
  MemoryHealthIndicator
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // PostgreSQL bağlantısını kontrol et
      () => this.db.pingCheck('database'),
      
      // Bellek kullanımını kontrol et (1GB'dan az olmalı)
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024)
    ]);
  }
} 