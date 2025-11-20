import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { ProductsService } from '../products/products.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { StoresService } from './stores.service';
import { ConnectStoreDto } from './dto/connect-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly productsService: ProductsService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get()
  list(@CurrentUser() user: CurrentUserType) {
    return this.storesService.listUserStores(user.id);
  }

  @Post('connect')
  connect(@CurrentUser() user: CurrentUserType, @Body() dto: ConnectStoreDto) {
    return this.storesService.connectStore(user.id, dto);
  }

  @Patch(':storeId')
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(user.id, storeId, dto);
  }

  @Post(':storeId/sync-products')
  async syncProducts(
    @CurrentUser() user: CurrentUserType,
    @Param('storeId') storeId: string,
  ) {
    await this.storesService.assertStoreOwnership(user.id, storeId);
    return this.productsService.syncStoreProducts(storeId);
  }

  @Patch(':storeId/integration')
  async updateIntegration(
    @CurrentUser() user: CurrentUserType,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    await this.storesService.assertStoreOwnership(user.id, storeId);
    return this.integrationsService.updateWhatsappSettings(storeId, dto);
  }
}
