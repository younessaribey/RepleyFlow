import { Injectable } from '@nestjs/common';
import { MessageDirection, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  logMessage(data: {
    storeId: string;
    orderId: string;
    direction: MessageDirection;
    templateName?: string;
    language?: string;
    placeholders?: Record<string, unknown>;
    payload?: Record<string, unknown>;
    status?: MessageStatus;
    whatsappMessageId?: string;
  }) {
    const { placeholders, payload, status, ...rest } = data;
    return this.prisma.message.create({
      data: {
        ...rest,
        placeholders: (placeholders ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined,
        status: status ?? MessageStatus.QUEUED,
      },
    });
  }

  updateStatus(
    whatsappMessageId: string,
    status: MessageStatus,
    payload?: Record<string, unknown>,
  ) {
    return this.prisma.message.updateMany({
      where: { whatsappMessageId },
      data: {
        status,
        payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined,
        deliveredAt:
          status === MessageStatus.DELIVERED ? new Date() : undefined,
      },
    });
  }

  listStoreMessages(storeId: string, pagination: PaginationDto) {
    const { page = 1, limit = 20 } = pagination;
    return this.prisma.message.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
