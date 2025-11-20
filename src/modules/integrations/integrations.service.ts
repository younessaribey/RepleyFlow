import { Injectable } from '@nestjs/common';
import { Prisma, Store } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { randomBytes } from 'crypto';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async createForStore(store: Store) {
    return this.prisma.integration.create({
      data: {
        storeId: store.id,
        webhookSecret: randomBytes(24).toString('hex'),
        verificationToken: randomBytes(8).toString('hex'),
        whatsappTemplateLanguage: 'fr',
      },
    });
  }

  findByStoreId(storeId: string) {
    return this.prisma.integration.findUnique({ where: { storeId } });
  }

  findByWebhookSecret(secret: string) {
    return this.prisma.integration.findFirst({
      where: { webhookSecret: secret },
      include: { store: true },
    });
  }

  async updateDeliverySettings(
    storeId: string,
    payload: {
      deliveryPartnerEnabled?: boolean;
      deliveryPartnerApiKey?: string;
      deliveryPartnerWebhookUrl?: string;
    },
  ) {
    const data: Prisma.IntegrationUpdateInput = {
      deliveryPartnerEnabled: payload.deliveryPartnerEnabled,
      deliveryPartnerWebhookUrl: payload.deliveryPartnerWebhookUrl,
    };

    if (payload.deliveryPartnerApiKey) {
      data.deliveryPartnerApiKey = this.encryptionService.encrypt(
        payload.deliveryPartnerApiKey,
      );
    }

    return this.prisma.integration.update({ where: { storeId }, data });
  }

  async updateWhatsappSettings(
    storeId: string,
    payload: {
      whatsappPhoneNumberId?: string;
      whatsappBusinessId?: string;
      whatsappTemplateName?: string;
      whatsappTemplateLanguage?: string;
    },
  ) {
    const data: Prisma.IntegrationUpdateInput = {
      whatsappPhoneNumberId: payload.whatsappPhoneNumberId,
      whatsappBusinessId: payload.whatsappBusinessId,
      whatsappTemplateName: payload.whatsappTemplateName,
      whatsappTemplateLanguage: payload.whatsappTemplateLanguage,
    };

    return this.prisma.integration.update({ where: { storeId }, data });
  }
}
