import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MessageDirection, MessageStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  buildTemplateComponents,
  TemplatePlaceholders,
} from '../../common/utils/template.util';
import { MessagesService } from '../messages/messages.service';
import { SseService } from '../../sse/sse.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly sseService: SseService,
    private readonly aiService: AiService,
  ) {}

  async sendTemplateMessage(job: {
    storeId: string;
    orderId: string;
    customerPhone?: string;
    placeholders?: TemplatePlaceholders;
    language?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: job.orderId },
      include: { store: { include: { integration: true } } },
    });

    if (!order || order.storeId !== job.storeId) {
      this.logger.warn(`Order ${job.orderId} not found for WhatsApp job`);
      return;
    }

    const integration = order.store.integration;
    if (!integration?.whatsappPhoneNumberId || !job.customerPhone) {
      this.logger.warn('Missing WhatsApp configuration or customer phone');
      return;
    }

    const defaultOrderTotal = order.totalAmount.toString();
    const placeholders: TemplatePlaceholders = {
      customerName:
        job.placeholders?.customerName ?? order.customerName ?? 'client',
      orderId: job.placeholders?.orderId ?? order.externalId,
      orderTotal: job.placeholders?.orderTotal ?? defaultOrderTotal,
      wilayaFullName:
        job.placeholders?.wilayaFullName ?? order.wilayaFullName ?? undefined,
      deliveryPrice:
        job.placeholders?.deliveryPrice ?? order.deliveryPrice?.toString(),
    };

    const templateName = integration.whatsappTemplateName ?? 'cod_confirmation';
    const language =
      job.language ?? integration.whatsappTemplateLanguage ?? 'fr';

    const logged = await this.messagesService.logMessage({
      storeId: order.storeId,
      orderId: order.id,
      direction: MessageDirection.OUTBOUND,
      templateName,
      language,
      placeholders,
    });

    try {
      // Most templates in our app use variables, but the default Meta sample
      // template `jaspers_market_plain_text_v1` does NOT expect any.
      // For that one we must not send components at all, to match the curl
      // call you verified in the Meta dashboard.
      const usesPlaceholders = templateName !== 'jaspers_market_plain_text_v1';

      const bodyParameters = usesPlaceholders
        ? buildTemplateComponents(placeholders)
        : [];

      const templatePayload: Record<string, unknown> = {
        name: templateName,
        language: { code: language },
      };

      // Only attach components if the template actually uses variables.
      // This mirrors the Meta example you tested manually (no components sent).
      if (bodyParameters.length > 0) {
        templatePayload.components = [
          {
            type: 'body',
            parameters: bodyParameters.map((text) => ({
              type: 'text',
              text,
            })),
          },
        ];
      }

      const response = await axios.post(
        `https://graph.facebook.com/v20.0/${integration.whatsappPhoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: job.customerPhone,
          type: 'template',
          template: templatePayload,
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('WHATSAPP_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageId = response.data?.messages?.[0]?.id;
      await this.prisma.message.update({
        where: { id: logged.id },
        data: {
          status: MessageStatus.SENT,
          whatsappMessageId: messageId,
          sentAt: new Date(),
        },
      });

      this.sseService.emit(
        'message_status_update',
        {
          storeId: order.storeId,
          orderId: order.id,
          messageId: logged.id,
          status: MessageStatus.SENT,
        },
        order.storeId,
      );
    } catch (error) {
      await this.prisma.message.update({
        where: { id: logged.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: error.message,
        },
      });

      this.logger.error('Failed to send WhatsApp message', error as Error);
      throw error;
    }
  }

  async sendTextMessage(params: {
    phoneNumberId: string;
    to: string;
    text: string;
    storeId: string;
    orderId: string;
  }) {
    const { phoneNumberId, to, text, storeId, orderId } = params;

    this.logger.log(`📤 Sending text message to ${to}`);

    // Log the message first
    const logged = await this.messagesService.logMessage({
      storeId,
      orderId,
      direction: MessageDirection.OUTBOUND,
      payload: { text: { body: text } },
    });

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get<string>('WHATSAPP_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageId = response.data?.messages?.[0]?.id;
      await this.prisma.message.update({
        where: { id: logged.id },
        data: {
          status: MessageStatus.SENT,
          whatsappMessageId: messageId,
          sentAt: new Date(),
        },
      });

      this.sseService.emit(
        'message_status_update',
        {
          storeId,
          orderId,
          messageId: logged.id,
          status: MessageStatus.SENT,
        },
        storeId,
      );

      this.logger.log(`✅ Text message sent successfully: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      await this.prisma.message.update({
        where: { id: logged.id },
        data: {
          status: MessageStatus.FAILED,
          errorMessage: (error as Error).message,
        },
      });

      this.logger.error('Failed to send text message', error as Error);
      throw error;
    }
  }

  async handleWebhook(body: any) {
    this.logger.log('🔔 WhatsApp webhook received');
    this.logger.log(`📦 Raw body: ${JSON.stringify(body)}`);

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const statuses = value?.statuses ?? [];
    const messages = value?.messages ?? [];
    const phoneNumberId = value?.metadata?.phone_number_id as
      | string
      | undefined;

    this.logger.log(
      `📊 Parsed: ${messages.length} messages, ${statuses.length} statuses, phoneNumberId=${phoneNumberId}`,
    );

    // 1) Update delivery statuses for outbound messages
    for (const status of statuses) {
      const messageId = status.id;
      const statusValue = this.mapWhatsappStatus(status.status);
      await this.messagesService.updateStatus(messageId, statusValue, status);
      const message = await this.prisma.message.findFirst({
        where: { whatsappMessageId: messageId },
      });
      if (message) {
        this.sseService.emit(
          'message_status_update',
          {
            storeId: message.storeId,
            orderId: message.orderId,
            status: statusValue,
          },
          message.storeId,
        );
      }
    }

    // 2) Persist inbound messages from the chat
    if (messages.length > 0 && phoneNumberId) {
      const integrations = await this.prisma.integration.findMany({
        where: { whatsappPhoneNumberId: phoneNumberId },
        select: { storeId: true },
      });

      if (integrations.length === 0) {
        this.logger.warn(
          `No integration found for phone_number_id=${phoneNumberId}`,
        );
      } else {
        const storeIds = integrations.map((entry) => entry.storeId);

        for (const message of messages) {
          // We only care about actual user text messages for now
          if (message.type !== 'text' || !message.from) {
            continue;
          }

          const customerPhone = message.from as string;
          this.logger.log(
            `📨 Processing inbound text message from ${customerPhone}`,
          );

          // Link the inbound reply to the most recent order across stores that share this phone number ID
          const order = await this.prisma.order.findFirst({
            where: {
              storeId: { in: storeIds },
              customerPhone,
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!order) {
            this.logger.warn(
              `Inbound WhatsApp message ${message.id} from ${customerPhone} but no matching order found for stores ${storeIds.join(',')}`,
            );

            continue;
          }

          this.logger.log(
            `✅ Found matching order ${order.id} for customer ${customerPhone}`,
          );
          this.logger.log(`💬 Message text: ${message.text?.body}`);

          const logged = await this.messagesService.logMessage({
            storeId: order.storeId,
            orderId: order.id,
            direction: MessageDirection.INBOUND,
            payload: message as Record<string, unknown>,
            status: MessageStatus.DELIVERED,
            whatsappMessageId: message.id as string,
          });

          this.sseService.emit(
            'message_status_update',
            {
              storeId: order.storeId,
              orderId: order.id,
              messageId: logged.id,
              status: MessageStatus.DELIVERED,
            },
            order.storeId,
          );

          // 🤖 Generate and send AI reply
          try {
            this.logger.log('🤖 Generating AI reply...');

            // Get conversation history
            const conversationHistory =
              await this.aiService.getConversationHistory(order.id, 10);

            // Generate AI reply
            const aiReply = await this.aiService.generateReply({
              customerMessage: message.text?.body || '',
              customerName: order.customerName || undefined,
              orderDetails: {
                orderId: order.externalId,
                totalAmount: order.totalAmount.toString(),
                wilayaFullName: order.wilayaFullName || undefined,
                status: order.status,
              },
              conversationHistory,
            });

            this.logger.log(`🤖 AI reply: ${aiReply}`);

            // Send the AI reply back to customer
            await this.sendTextMessage({
              phoneNumberId,
              to: customerPhone,
              text: aiReply,
              storeId: order.storeId,
              orderId: order.id,
            });

            this.logger.log('✅ AI reply sent successfully');
          } catch (aiError) {
            this.logger.error(
              'Failed to generate or send AI reply',
              aiError as Error,
            );
            // Don't throw - we still want to acknowledge the webhook
          }
        }
      }
    }

    return { received: true };
  }

  private mapWhatsappStatus(input: string): MessageStatus {
    switch (input) {
      case 'delivered':
      case 'read':
        return MessageStatus.DELIVERED;
      case 'failed':
      case 'error':
        return MessageStatus.FAILED;
      case 'sent':
        return MessageStatus.SENT;
      default:
        return MessageStatus.QUEUED;
    }
  }
}
