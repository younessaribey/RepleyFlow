import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { MessagesModule } from '../messages/messages.module';
import { SseModule } from '../../sse/sse.module';

@Module({
  imports: [ConfigModule, MessagesModule, SseModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
