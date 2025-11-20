import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (
      mode === 'subscribe' &&
      token === this.configService.get<string>('WHATSAPP_VERIFY_TOKEN')
    ) {
      return challenge;
    }
    return 'unauthorized';
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    console.log('🔔 WEBHOOK POST RECEIVED at', new Date().toISOString());
    console.log('📦 Full payload:', JSON.stringify(body, null, 2));

    const result = await this.whatsappService.handleWebhook(body);

    console.log('✅ Webhook handled successfully');
    return result;
  }
}
