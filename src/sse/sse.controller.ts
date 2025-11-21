import {
  Controller,
  MessageEvent,
  Param,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(
    private readonly sseService: SseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Sse('stream/:storeId')
  stream(
    @Param('storeId') storeId: string,
    @Query('token') token?: string,
  ): Observable<MessageEvent> {
    // Validate JWT token from query parameter
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    try {
      this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.sseService.subscribe(storeId);
  }

  @Sse('stream')
  streamAll(@Query('token') token?: string): Observable<MessageEvent> {
    // Validate JWT token from query parameter
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      // Subscribe to all stores for this user
      return this.sseService.subscribe(`user:${payload.sub}`);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
