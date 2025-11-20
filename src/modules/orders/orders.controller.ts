import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StorePlatform } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('webhook/:platform')
  handleWebhook(
    @Param('platform') platform: string,
    @Query('token') token: string,
    @Body() payload: any,
  ) {
    const resolvedPlatform = this.resolvePlatform(platform);
    return this.ordersService.handleOrderWebhook(
      resolvedPlatform,
      token,
      payload,
    );
  }

  @Get('wilaya-stats/:storeId')
  @UseGuards(JwtAuthGuard)
  wilayaStats(
    @Param('storeId') storeId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.ordersService.getWilayaStats(storeId, user.id);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  getOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.ordersService.getOrderForUser(orderId, user.id);
  }

  @Patch(':orderId/assign-delivery')
  @UseGuards(JwtAuthGuard)
  assignDelivery(
    @Param('orderId') orderId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() dto: AssignDeliveryDto,
  ) {
    return this.ordersService.assignDelivery(orderId, user.id, dto);
  }

  private resolvePlatform(platform: string): StorePlatform {
    const normalized = platform?.toUpperCase();
    const match = Object.values(StorePlatform).find(
      (value) => value === normalized,
    );
    if (!match) {
      throw new BadRequestException('Unsupported platform');
    }
    return match as StorePlatform;
  }
}
