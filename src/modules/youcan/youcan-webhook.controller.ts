import { Body, Controller, Headers, Post, Query } from '@nestjs/common';
import { YoucanWebhookService } from './youcan-webhook.service';

@Controller('youcan/webhook')
export class YoucanWebhookController {
  constructor(private readonly webhookService: YoucanWebhookService) {}

  @Post()
  async handleOrderCreate(
    @Query('token') token: string,
    @Headers('x-youcan-signature') signature: string,
    @Body() payload: any,
  ) {
    await this.webhookService.handleOrderCreated(token, signature, payload);
    return { received: true };
  }
}
