import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get('my-company')
  @Roles(UserRole.COMPANY_ADMIN)
  getMyCompany(@Req() req) {
    if (!req.user.companyId) {
      throw new ForbiddenException('You are not associated with any company');
    }
    return this.companiesService.findCompanyWithDetails(req.user.companyId);
  }

  @Get('my-company/dashboard')
  @Roles(UserRole.COMPANY_ADMIN)
  getMyCompanyDashboard(@Req() req) {
    if (!req.user.companyId) {
      throw new ForbiddenException('You are not associated with any company');
    }
    return this.companiesService.getCompanyDashboard(req.user.companyId);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  async update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto, @Req() req) {
    // CompanyAdmin rolündeki kullanıcı sadece kendi şirketini güncelleyebilir
    if (req.user.role === UserRole.COMPANY_ADMIN) {
      // Kullanıcının şirketini kontrol et
      if (req.user.companyId !== id) {
        throw new ForbiddenException('You can only update your own company');
      }
      
      // CompanyAdmin, companyAdminId değişikliği yapamaz (sadece SystemAdmin yapabilir)
      if (updateCompanyDto.companyAdminId) {
        throw new ForbiddenException('Only SystemAdmin can change company administrator');
      }
    }
    
    return this.companiesService.update(id, updateCompanyDto, req.user);
  }

  @Patch('my-company')
  @Roles(UserRole.COMPANY_ADMIN)
  updateMyCompany(@Body() updateCompanyDto: UpdateCompanyDto, @Req() req) {
    if (!req.user.companyId) {
      throw new ForbiddenException('You are not associated with any company');
    }
    
    // CompanyAdmin, companyAdminId değişikliği yapamaz
    if (updateCompanyDto.companyAdminId) {
      throw new ForbiddenException('Only SystemAdmin can change company administrator');
    }
    
    return this.companiesService.update(req.user.companyId, updateCompanyDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPANY_ADMIN)
  async remove(@Param('id') id: string, @Req() req) {
    // CompanyAdmin rolündeki kullanıcı sadece kendi şirketini silebilir
    if (req.user.role === UserRole.COMPANY_ADMIN) {
      // Kullanıcının şirketini kontrol et
      if (req.user.companyId !== id) {
        throw new ForbiddenException('You can only delete your own company');
      }
      
      // CompanyAdmin'in tek CompanyAdmin olup olmadığını kontrol et
      const isOnlyAdmin = await this.companiesService.isOnlyCompanyAdmin(id, req.user.id);
      
      if (!isOnlyAdmin) {
        throw new ForbiddenException('Only the last CompanyAdmin can delete a company');
      }
    }
    
    await this.companiesService.remove(id);
    
    return { message: 'Company deleted successfully' };
  }
}
