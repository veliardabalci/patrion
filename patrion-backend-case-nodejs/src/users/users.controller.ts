import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    // CompanyAdmin sadece kendi şirketine kullanıcı ekleyebilir
    if (req.user.role === UserRole.COMPANY_ADMIN) {
      // CompanyAdmin kendi şirketine kullanıcı ekleyebilir
      if (createUserDto.companyId && createUserDto.companyId !== req.user.companyId) {
        throw new ForbiddenException('CompanyAdmin can only add users to their own company');
      }
      
      // CompanyAdmin başka bir CompanyAdmin ekleyemez
      if (createUserDto.role === UserRole.COMPANY_ADMIN) {
        throw new ForbiddenException('CompanyAdmin cannot create another CompanyAdmin');
      }
      
      // CompanyAdmin'in oluşturduğu kullanıcılar mutlaka kendi şirketine bağlı olmalı
      createUserDto.companyId = req.user.companyId;
    }
    
    return this.usersService.create(createUserDto);
  }

  @Post('admin-create')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  createByAdmin(@Body() createAdminUserDto: CreateAdminUserDto, @Req() req) {
    // SystemAdmin ve CompanyAdmin için farklı yetki kontrolleri
    if (req.user.role === UserRole.SYSTEM_ADMIN) {
      // SystemAdmin, SystemAdmin rolünde kullanıcı oluşturamaz
      if (createAdminUserDto.role === UserRole.SYSTEM_ADMIN) {
        throw new ForbiddenException('Cannot create SystemAdmin user');
      }
      
      // CompanyAdmin rolündeki kullanıcılar için companyId zorunlu
      if (createAdminUserDto.role === UserRole.COMPANY_ADMIN && !createAdminUserDto.companyId) {
        throw new ForbiddenException('Company ID is required for CompanyAdmin role');
      }

      // Şirketli veya şirketsiz normal kullanıcı oluşturulabilir (SystemAdmin yetkisi)
      return this.usersService.createByAdmin(createAdminUserDto);
    } 
    // CompanyAdmin kullanıcıları için özel kontroller
    else if (req.user.role === UserRole.COMPANY_ADMIN) {
      // CompanyAdmin sadece kendi şirketine bağlı kullanıcı oluşturabilir
      if (createAdminUserDto.companyId && createAdminUserDto.companyId !== req.user.companyId) {
        throw new ForbiddenException('CompanyAdmin can only add users to their own company');
      }
      
      // CompanyAdmin başka bir CompanyAdmin oluşturamaz
      if (createAdminUserDto.role === UserRole.COMPANY_ADMIN) {
        throw new ForbiddenException('CompanyAdmin cannot create another CompanyAdmin');
      }
      
      // CompanyAdmin SystemAdmin oluşturamaz
      if (createAdminUserDto.role === UserRole.SYSTEM_ADMIN) {
        throw new ForbiddenException('CompanyAdmin cannot create SystemAdmin');
      }
      
      // CompanyAdmin'in oluşturduğu kullanıcılar kendi şirketine bağlı olmalı
      createAdminUserDto.companyId = req.user.companyId;
      
      // Normal kullanıcı oluştur (CompanyAdmin yetkisi)
      return this.usersService.createByAdmin(createAdminUserDto);
    }
  }

  @Get('me')
  getProfile(@Req() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('company/:companyId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  findByCompany(@Param('companyId') companyId: string, @Req() req) {
    // CompanyAdmin sadece kendi şirketindeki kullanıcıları görebilir
    if (req.user.role === UserRole.COMPANY_ADMIN && req.user.companyId !== companyId) {
      throw new ForbiddenException('You can only view users from your own company');
    }
    
    return this.usersService.findByCompany(companyId);
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  findOne(@Param('id') id: string, @Req() req) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    // Kullanıcı bilgisini al
    const user = await this.usersService.findOne(id);
    
    // CompanyAdmin kontrolü
    if (req.user.role === UserRole.COMPANY_ADMIN) {
      // Kullanıcı, CompanyAdmin'in şirketine ait değilse
      if (user.companyId !== req.user.companyId) {
        throw new ForbiddenException('You can only update users from your own company');
      }
      
      // CompanyAdmin başka bir CompanyAdmin'i düzenleyemez
      if (user.role === UserRole.COMPANY_ADMIN && user.id !== req.user.id) {
        throw new ForbiddenException('CompanyAdmin cannot update another CompanyAdmin');
      }
      
      // CompanyAdmin bir kullanıcıyı CompanyAdmin yapamaz
      if (updateUserDto.role === UserRole.COMPANY_ADMIN && user.role !== UserRole.COMPANY_ADMIN) {
        throw new ForbiddenException('CompanyAdmin cannot promote users to CompanyAdmin');
      }
      
      // CompanyAdmin kullanıcının şirketini değiştiremez
      if (updateUserDto.companyId && updateUserDto.companyId !== req.user.companyId) {
        throw new ForbiddenException('CompanyAdmin cannot change user company');
      }
    }
    
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  async remove(@Param('id') id: string, @Req() req) {
    // CompanyAdmin rolündeki bir kullanıcı sadece kendi şirketindeki kullanıcıları silebilir
    if (req.user.role === UserRole.COMPANY_ADMIN) {
      const user = await this.usersService.findOne(id);
      
      // Kullanıcı, CompanyAdmin'in şirketine ait mi kontrol et
      if (user.companyId !== req.user.companyId) {
        throw new ForbiddenException('You can only delete users from your own company');
      }
      
      // CompanyAdmin kendi şirketindeki başka bir CompanyAdmin'i silemez
      if (user.role === UserRole.COMPANY_ADMIN && user.id !== req.user.id) {
        throw new ForbiddenException('Company admins cannot delete other company admins');
      }
    }
    
    await this.usersService.remove(id);
    
    return { message: 'User deleted successfully' };
  }
}
