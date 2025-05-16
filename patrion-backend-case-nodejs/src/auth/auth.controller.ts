import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const decodedToken = this.authService.jwtService.decode(refreshTokenDto.refresh_token);
      if (!decodedToken || typeof decodedToken !== 'object') {
        return { error: 'Invalid token' };
      }
      return this.authService.refreshTokens(decodedToken.sub as string, refreshTokenDto.refresh_token);
    } catch (error) {
      return { error: 'Invalid token' };
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req) {
    const authHeader = req.headers.authorization;
    return this.authService.logout(req.user.id, authHeader);
  }
}
