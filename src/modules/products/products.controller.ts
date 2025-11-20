import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':storeId')
  async list(
    @Param('storeId') storeId: string,
    @CurrentUser() user: CurrentUserType,
    @Query() pagination: PaginationDto,
  ) {
    return this.productsService.listStoreProductsForUser(
      storeId,
      user.id,
      pagination,
    );
  }

  @Post(':storeId/sync')
  async sync(
    @Param('storeId') storeId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.productsService.syncStoreProductsForUser(storeId, user.id);
  }
}
