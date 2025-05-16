import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenBlacklistService {
  private blacklistedTokens: Map<string, number> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Her 1 saatte bir süresi dolmuş tokenları temizle
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  blacklistToken(token: string): void {
    try {
      // Bearer prefix'ini kaldır
      const actualToken = token.replace('Bearer ', '');
      
      // Token'ı decode et ve expiry time'ı al
      const decoded = this.jwtService.decode(actualToken);
      if (decoded && typeof decoded === 'object' && decoded.exp) {
        this.blacklistedTokens.set(actualToken, decoded.exp);
      }
    } catch (error) {
      console.error('Token blacklisting failed:', error);
    }
  }

  isBlacklisted(token: string): boolean {
    // Bearer prefix'ini kaldır
    const actualToken = token.replace('Bearer ', '');
    return this.blacklistedTokens.has(actualToken);
  }

  private cleanupExpiredTokens(): void {
    const now = Math.floor(Date.now() / 1000);
    
    for (const [token, expiry] of this.blacklistedTokens.entries()) {
      if (expiry < now) {
        this.blacklistedTokens.delete(token);
      }
    }
  }
} 