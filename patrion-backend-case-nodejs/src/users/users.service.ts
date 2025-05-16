import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { Company } from '../companies/entities/company.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    private dataSource: DataSource,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ 
      where: { email: createUserDto.email } 
    });
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // SystemAdmin rolü atanmasını engelle
    if (createUserDto.role === UserRole.SYSTEM_ADMIN) {
      throw new ConflictException('SystemAdmin role cannot be assigned manually');
    }

    // Kullanıcı nesnesini oluştur
    const user = this.usersRepository.create(createUserDto);
    
    // Şifreyi manuel olarak hashle (entity hook'u bazen çalışmayabiliyor)
    if (user.password && user.password.length < 60) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    
    // Kullanıcıyı kaydet
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find({ relations: ['company'] });
    
    // Şifre ve refresh token'ı dışla
    return users.map(user => {
      const { password, refreshToken, ...result } = user;
      return result as User;
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { id },
      relations: ['company'] 
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // Şifre ve refresh token'ı dışla
    const { password, refreshToken, ...result } = user;
    return result as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      relations: ['company'] 
    });
    
    if (!user) {
      return null;
    }
    
    // Auth servisinde şifre doğrulama için kullanıldığından burada değişiklik yapmıyoruz
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Kullanıcıyı ID ile bul (şifre ve refresh token'ı içerecek şekilde)
    const rawUser = await this.usersRepository.findOne({ 
      where: { id },
      relations: ['company'] 
    });
    
    if (!rawUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    if (updateUserDto.email && updateUserDto.email !== rawUser.email) {
      const existingUser = await this.usersRepository.findOne({ 
        where: { email: updateUserDto.email } 
      });
      
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }
    
    // SystemAdmin rolüne yükseltilmeyi engelle
    if (updateUserDto.role === UserRole.SYSTEM_ADMIN && rawUser.role !== UserRole.SYSTEM_ADMIN) {
      throw new ConflictException('Cannot upgrade user to SystemAdmin role');
    }
    
    // CompanyAdmin rolü ile ilgili özel kontroller
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // 1. Rol CompanyAdmin olarak değiştiriliyorsa companyId gerekli
      if (updateUserDto.role === UserRole.COMPANY_ADMIN && rawUser.role !== UserRole.COMPANY_ADMIN) {
        if (!updateUserDto.companyId && !rawUser.companyId) {
          throw new BadRequestException('Company ID is required for CompanyAdmin role');
        }
        
        const companyId = updateUserDto.companyId || rawUser.companyId;
        
        if (companyId) {
          // Şirketin var olduğunu kontrol et
          const company = await this.companiesRepository.findOne({
            where: { id: companyId }
          });
          
          if (!company) {
            throw new NotFoundException(`Company with ID ${companyId} not found`);
          }
          
          // Kullanıcının companyId'sini güncelle
          rawUser.companyId = companyId;
          
          // Şirketin mevcut bir CompanyAdmin'i varsa, onu sorgula
          if (company.companyAdminId && company.companyAdminId !== id) {
            // Mevcut admin varsa, rolünü değiştir
            const currentAdmin = await this.usersRepository.findOne({
              where: { id: company.companyAdminId }
            });
            
            if (currentAdmin && currentAdmin.role === UserRole.COMPANY_ADMIN) {
              currentAdmin.role = UserRole.USER;
              await this.usersRepository.save(currentAdmin);
            }
          }
          
          // Yeni CompanyAdmin atanıyorsa, şirketin Company entity'sini de güncelle
          company.companyAdminId = id;
          await this.companiesRepository.save(company);
        }
      }
      
      // 2. Kullanıcı şirket değiştiriyorsa ve CompanyAdmin ise özel işlem yap
      if (updateUserDto.companyId && updateUserDto.companyId !== rawUser.companyId && 
          (rawUser.role === UserRole.COMPANY_ADMIN || updateUserDto.role === UserRole.COMPANY_ADMIN)) {
        
        // Kullanıcı CompanyAdmin ise ve şirketi değişiyorsa
        if (rawUser.role === UserRole.COMPANY_ADMIN && rawUser.companyId) {
          // Eski şirketin CompanyAdmin'i bu kullanıcı mı kontrol et
          const oldCompany = await this.companiesRepository.findOne({
            where: { 
              id: rawUser.companyId,
              companyAdminId: id 
            }
          });
          
          if (oldCompany) {
            throw new ConflictException('Cannot change company of a CompanyAdmin. Assign a new CompanyAdmin to the current company first.');
          }
        }
        
        // Rol CompanyAdmin olarak değiştiriliyorsa yeni şirketi güncelle
        if (updateUserDto.role === UserRole.COMPANY_ADMIN) {
          const newCompany = await this.companiesRepository.findOne({
            where: { id: updateUserDto.companyId }
          });
          
          if (!newCompany) {
            throw new NotFoundException(`Company with ID ${updateUserDto.companyId} not found`);
          }
          
          // Şirketin CompanyAdmin'ini güncelle
          newCompany.companyAdminId = id;
          await this.companiesRepository.save(newCompany);
          
          // Kullanıcının companyId'sini güncelle
          rawUser.companyId = updateUserDto.companyId;
        } else {
          // Normal kullanıcı için şirket değişikliği
          rawUser.companyId = updateUserDto.companyId;
        }
      }
      
      // 3. Kullanıcı CompanyAdmin iken rolü değiştiriliyorsa özel işlem yap
      if (rawUser.role === UserRole.COMPANY_ADMIN && 
          updateUserDto.role && updateUserDto.role !== UserRole.COMPANY_ADMIN) {
        
        // Bu kullanıcının şirketin CompanyAdmin'i olup olmadığını kontrol et
        const company = await this.companiesRepository.findOne({
          where: { companyAdminId: id }
        });
        
        if (company) {
          throw new ConflictException('Cannot change role of a CompanyAdmin. Assign a new CompanyAdmin to the company first.');
        }
      }
      
      // 4. Rol değişmiyor ama companyId değişiyorsa
      if (updateUserDto.companyId !== undefined && updateUserDto.companyId !== rawUser.companyId && 
          !updateUserDto.role && rawUser.role !== UserRole.COMPANY_ADMIN) {
        
        // Normal kullanıcı için companyId güncelleme
        rawUser.companyId = updateUserDto.companyId;
      }
      
      // 5. CompanyAdmin olmayan bir kullanıcının companyId'si null yapılıyorsa
      if (updateUserDto.companyId === null && rawUser.companyId && 
          (rawUser.role !== UserRole.COMPANY_ADMIN && (!updateUserDto.role || updateUserDto.role !== UserRole.COMPANY_ADMIN))) {
        
        // Şirketten ayrılan normal kullanıcı
        rawUser.companyId = null;
      }

      // Değişiklikleri uygula
      Object.assign(rawUser, updateUserDto);
      
      // Kullanıcıyı güncelle
      await this.usersRepository.save(rawUser);
      
      // Tüm verilerin güncellenmesini sağlamak için explicit query ile güncelleme yapalım
      if (updateUserDto.companyId !== undefined) {
        await this.usersRepository.createQueryBuilder()
          .update(User)
          .set({ companyId: updateUserDto.companyId })
          .where("id = :id", { id })
          .execute();
      }
      
      // Transaction'ı tamamla
      await queryRunner.commitTransaction();
      
      // Güncel verileri al (şirket ilişkisi dahil)
      const updatedUser = await this.usersRepository.findOne({
        where: { id },
        relations: ['company']
      });
      
      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found after update`);
      }
      
      // Şifre ve refresh token'ı dışla
      const { password, refreshToken, ...result } = updatedUser;
      return result as User;
    } catch (error) {
      // Hata durumunda rollback yap
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // QueryRunner'ı serbest bırak
      await queryRunner.release();
    }
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    await this.usersRepository.update(id, { 
      refreshToken: refreshToken as string | undefined 
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    
    // SystemAdmin rolündeki kullanıcıyı silmeyi engelle
    if (user.role === UserRole.SYSTEM_ADMIN) {
      throw new ConflictException('Cannot delete SystemAdmin user');
    }
    
    // Şu anki tek CompanyAdmin ise silmeyi engelle
    if (user.role === UserRole.COMPANY_ADMIN && user.companyId) {
      const companyAdminCount = await this.usersRepository.count({
        where: {
          companyId: user.companyId,
          role: UserRole.COMPANY_ADMIN
        }
      });
      
      if (companyAdminCount <= 1) {
        throw new ConflictException('Cannot delete the only CompanyAdmin of a company');
      }
    }
    
    // Kullanıcıyı silmeden önce refresh token'ı temizle
    await this.updateRefreshToken(id, null);
    
    await this.usersRepository.remove(user);
  }

  async findByCompany(companyId: string): Promise<User[]> {
    const users = await this.usersRepository.find({ 
      where: { companyId },
      relations: ['company'] 
    });
    
    // Şifre ve refresh token'ı dışla
    return users.map(user => {
      const { password, refreshToken, ...result } = user;
      return result as User;
    });
  }

  async createSystemAdmin(createUserDto: CreateUserDto): Promise<User> {
    // SystemAdmin zaten var mı kontrol et
    const adminExists = await this.checkSystemAdminExists();
    if (adminExists) {
      throw new ConflictException('SystemAdmin already exists');
    }
    
    // Email kontrolü
    const existingUser = await this.usersRepository.findOne({ 
      where: { email: createUserDto.email } 
    });
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    
    // SystemAdmin rolünü atayarak kullanıcı oluştur
    const user = this.usersRepository.create({
      ...createUserDto,
      role: UserRole.SYSTEM_ADMIN,
    });
    
    // Şifreyi manuel olarak hashle
    if (user.password && user.password.length < 60) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    
    return this.usersRepository.save(user);
  }

  async checkSystemAdminExists(): Promise<boolean> {
    const count = await this.usersRepository.count({
      where: { role: UserRole.SYSTEM_ADMIN }
    });
    
    return count > 0;
  }

  async createByAdmin(createAdminUserDto: CreateAdminUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ 
      where: { email: createAdminUserDto.email } 
    });
    
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // CompanyAdmin rolü seçildiyse companyId kontrolü yap
    if (createAdminUserDto.role === UserRole.COMPANY_ADMIN && !createAdminUserDto.companyId) {
      throw new ConflictException('Company ID is required for CompanyAdmin role');
    }

    // Normal user için companyId opsiyonel
    const userData = { ...createAdminUserDto };
    
    // Kullanıcıyı oluştur
    const user = this.usersRepository.create(userData);
    
    // Şifreyi manuel olarak hashle
    if (user.password && user.password.length < 60) {
      user.password = await bcrypt.hash(user.password, 10);
    }
    
    const savedUser = await this.usersRepository.save(user);
    
    // CompanyAdmin rolü atandıysa şirketi güncelle
    if (savedUser.role === UserRole.COMPANY_ADMIN && savedUser.companyId) {
      // Şirketin CompanyAdmin'ini güncelle
      await this.companiesRepository.update(savedUser.companyId, {
        companyAdminId: savedUser.id
      });
    }
    
    return savedUser;
  }
}
