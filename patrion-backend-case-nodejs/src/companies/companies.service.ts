import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const existingCompany = await this.companiesRepository.findOne({ 
      where: { name: createCompanyDto.name } 
    });
    
    if (existingCompany) {
      throw new ConflictException('Company name already exists');
    }

    // CompanyAdmin olarak atanacak kullanıcıyı kontrol et
    const user = await this.usersRepository.findOne({
      where: { id: createCompanyDto.companyAdminId }
    });

    if (!user) {
      throw new BadRequestException(`User with ID ${createCompanyDto.companyAdminId} not found`);
    }

    if (user.companyId) {
      throw new BadRequestException(`User with ID ${createCompanyDto.companyAdminId} already belongs to another company`);
    }

    // Transaction başlat
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Şirketi oluştur
      const company = this.companiesRepository.create(createCompanyDto);
      const savedCompany = await this.companiesRepository.save(company);

      // Kullanıcıyı CompanyAdmin olarak güncelle
      user.role = UserRole.COMPANY_ADMIN;
      user.companyId = savedCompany.id;
      await this.usersRepository.save(user);

      // Transaction'ı tamamla
      await queryRunner.commitTransaction();

      return savedCompany;
    } catch (error) {
      // Hata durumunda rollback yap
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // QueryRunner'ı serbest bırak
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Company[]> {
    return this.companiesRepository.find({
      relations: ['companyAdmin', 'users'],
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({ 
      where: { id },
      relations: ['companyAdmin', 'users'] 
    });
    
    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    
    return company;
  }

  async findCompanyWithDetails(id: string): Promise<any> {
    // Şirketi getir
    const company = await this.findOne(id);
    
    // Şirketin CompanyAdmin'ini getir
    const companyAdmin = await this.usersRepository.findOne({
      where: { id: company.companyAdminId }
    });
    
    if (!companyAdmin) {
      throw new NotFoundException(`Company Administrator not found`);
    }
    
    // Şirketteki diğer kullanıcıları getir
    const users = await this.usersRepository.find({
      where: { companyId: id }
    });
    
    // Kullanıcılardan şifre ve token bilgilerini çıkar
    const sanitizedUsers = users.map(user => {
      const { password, refreshToken, ...result } = user;
      return result;
    });
    
    // CompanyAdmin'i de aynı şekilde sanitize et
    const { password, refreshToken, ...adminData } = companyAdmin;
    
    // Tüm verileri birleştir
    return {
      ...company,
      companyAdmin: adminData,
      userCount: sanitizedUsers.length,
      users: sanitizedUsers
    };
  }

  async getCompanyDashboard(companyId: string): Promise<any> {
    // Şirket bilgilerini getir
    const company = await this.findOne(companyId);
    
    // Kullanıcı sayısını hesapla
    const userCount = await this.usersRepository.count({
      where: { companyId }
    });
    
    // Rol bazında kullanıcı dağılımı
    const companyAdminCount = await this.usersRepository.count({
      where: { 
        companyId,
        role: UserRole.COMPANY_ADMIN
      }
    });
    
    const regularUserCount = await this.usersRepository.count({
      where: { 
        companyId,
        role: UserRole.USER
      }
    });
    
    // Son eklenen kullanıcılar (maksimum 5)
    const recentUsers = await this.usersRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 5
    });
    
    // Kullanıcılardan şifre ve token bilgilerini çıkar
    const sanitizedRecentUsers = recentUsers.map(user => {
      const { password, refreshToken, ...result } = user;
      return result;
    });
    
    // Dashboard verilerini oluştur
    return {
      companyId: company.id,
      companyName: company.name,
      statistics: {
        totalUsers: userCount,
        companyAdmins: companyAdminCount,
        regularUsers: regularUserCount,
      },
      recentUsers: sanitizedRecentUsers
    };
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, currentUser?: User): Promise<Company> {
    const company = await this.findOne(id);
    
    if (updateCompanyDto.name && updateCompanyDto.name !== company.name) {
      const existingCompany = await this.companiesRepository.findOne({ 
        where: { name: updateCompanyDto.name } 
      });
      
      if (existingCompany) {
        throw new ConflictException('Company name already exists');
      }
    }
    
    // Transaction başlat
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // CompanyAdminId değiştirilirse yeni admin kontrolü yap
      if (updateCompanyDto.companyAdminId && updateCompanyDto.companyAdminId !== company.companyAdminId) {
        const newAdmin = await this.usersRepository.findOne({
          where: { id: updateCompanyDto.companyAdminId }
        });

        if (!newAdmin) {
          throw new BadRequestException(`User with ID ${updateCompanyDto.companyAdminId} not found`);
        }

        if (newAdmin.companyId && newAdmin.companyId !== company.id) {
          throw new BadRequestException(`User with ID ${updateCompanyDto.companyAdminId} already belongs to another company`);
        }

        // Eski adminı normal kullanıcı yap (eğer aynı şirkete aitse)
        const oldAdmin = await this.usersRepository.findOne({
          where: { id: company.companyAdminId }
        });

        if (oldAdmin && oldAdmin.companyId === company.id) {
          oldAdmin.role = UserRole.USER;
          // Eski admin bu şirkete bağlı kalacak mı? Eğer kalacaksa companyId değiştirmeye gerek yok
          // Eğer bağlantısı kesilecekse aşağıdaki satırı aktif ediniz.
          // oldAdmin.companyId = null;
          await this.usersRepository.save(oldAdmin);
        }

        // Yeni adminı güncelle
        newAdmin.role = UserRole.COMPANY_ADMIN;
        newAdmin.companyId = company.id; // Yeni admin'in companyId'sini şirket ID'si ile güncelle
        await this.usersRepository.save(newAdmin);
      } else {
        // CompanyAdmin değişmiyor, ancak mevcut CompanyAdmin'in bilgilerini güncelle
        // Şirket adı değişimini CompanyAdmin'e yansıt
        if (updateCompanyDto.name && updateCompanyDto.name !== company.name) {
          const companyAdmin = await this.usersRepository.findOne({
            where: { id: company.companyAdminId }
          });
          
          if (companyAdmin) {
            // CompanyAdmin'in şirket bilgisinin güncel olduğundan emin ol
            if (companyAdmin.companyId !== company.id) {
              companyAdmin.companyId = company.id;
              await this.usersRepository.save(companyAdmin);
            } else {
              // CompanyAdmin'in adını/bilgilerini güncelle - Bu kısım ihtiyaca göre düzenlenebilir
              // Örneğin şirket adı bilgisi kullanıcıda saklanabilir veya kullanıcının şirket profili güncellenebilir
              await this.usersRepository.save(companyAdmin);
            }
          }
        }
      }
      
      // Şirketi güncelle
      Object.assign(company, updateCompanyDto);
      const updatedCompany = await this.companiesRepository.save(company);
      
      // Transaction'ı tamamla
      await queryRunner.commitTransaction();
      
      return updatedCompany;
    } catch (error) {
      // Hata durumunda rollback yap
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // QueryRunner'ı serbest bırak
      await queryRunner.release();
    }
  }

  async isOnlyCompanyAdmin(companyId: string, userId: string): Promise<boolean> {
    // Şirketteki CompanyAdmin sayısını kontrol et
    const companyAdminCount = await this.usersRepository.count({
      where: {
        companyId,
        role: UserRole.COMPANY_ADMIN
      }
    });
    
    // Eğer sadece bir CompanyAdmin varsa ve o da sorguyu yapan kullanıcıysa true döndür
    if (companyAdminCount === 1) {
      const admin = await this.usersRepository.findOne({
        where: {
          companyId,
          role: UserRole.COMPANY_ADMIN
        }
      });
      
      if (admin) {
        return admin.id === userId;
      }
    }
    
    return false;
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    
    // Şirkete bağlı kullanıcıları getir
    const users = await this.usersRepository.find({
      where: { companyId: id }
    });
    
    // Transaction başlat
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Tüm kullanıcıların şirket bağlantısını kaldır
      if (users.length > 0) {
        for (const user of users) {
          let newRole = user.role;
          
          // CompanyAdmin rolündeki kullanıcıları normal kullanıcı yap
          if (user.role === UserRole.COMPANY_ADMIN) {
            newRole = UserRole.USER;
          }
          
          // Şirket bağlantısını kaldır (null olarak ayarla)
          await this.usersRepository.update(user.id, { 
            companyId: null,
            role: newRole
          });
        }
      }
      
      // Şirketi sil
      await this.companiesRepository.remove(company);
      
      // Transaction'ı tamamla
      await queryRunner.commitTransaction();
    } catch (error) {
      // Hata durumunda rollback yap
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // QueryRunner'ı serbest bırak
      await queryRunner.release();
    }
  }
}
