// auth/socket-jwt.middleware.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { UsersService } from '../users/users.service';

@Injectable()
export class SocketJwtMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {}

  async use(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
      if (!token) throw new UnauthorizedException('JWT token missing');

      // Token'dan kullanıcı ID'sini çıkar
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid JWT payload');
      }
      
      // Kullanıcı detaylarını veritabanından al
      try {
        const user = await this.usersService.findOne(payload.sub);
        // Kullanıcı bilgileri ve token payload'ı birleştir
        socket.data.user = {
          ...payload,
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          firstName: user.firstName,
          lastName: user.lastName
        };
        next();
      } catch (error) {
        // Kullanıcı bulunamadıysa hata döndür
        next(new UnauthorizedException('User not found'));
      }
    } catch (err) {
      next(new UnauthorizedException('Invalid JWT'));
    }
  }
}
