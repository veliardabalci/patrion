import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class TokenBlacklistMiddleware implements NestMiddleware {
  constructor(private tokenBlacklistService: TokenBlacklistService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader && this.tokenBlacklistService.isBlacklisted(authHeader)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    next();
  }
} 