import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  listAll(
    @CurrentUser() user: CurrentUserType,
    @Query() pagination: PaginationDto,
  ) {
    return this.messagesService.listUserMessages(user.id, pagination);
  }

  @Get(':storeId')
  list(@Param('storeId') storeId: string, @Query() pagination: PaginationDto) {
    return this.messagesService.listStoreMessages(storeId, pagination);
  }
}
