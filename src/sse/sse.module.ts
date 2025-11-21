import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';

@Module({
  imports: [JwtModule, ConfigModule],
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
