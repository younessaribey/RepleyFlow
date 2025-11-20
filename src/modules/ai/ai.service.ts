import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set, AI features disabled');
    }
  }

  async generateReply(params: {
    customerMessage: string;
    customerName?: string;
    orderDetails?: {
      orderId: string;
      totalAmount: string;
      wilayaFullName?: string;
      status: string;
    };
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const { customerMessage, customerName, orderDetails, conversationHistory } =
      params;

    // Build context for GPT
    const systemPrompt = this.buildSystemPrompt(orderDetails);
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if available
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      });
    }

    // Add current customer message
    messages.push({
      role: 'user',
      content: customerMessage,
    });

    this.logger.log(
      `Generating AI reply for customer: ${customerName || 'Unknown'}`,
    );

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      const reply = completion.choices[0]?.message?.content || '';
      this.logger.log(`AI reply generated: ${reply.substring(0, 50)}...`);

      return reply;
    } catch (error) {
      this.logger.error('Failed to generate AI reply', error as Error);
      throw error;
    }
  }

  private buildSystemPrompt(orderDetails?: {
    orderId: string;
    totalAmount: string;
    wilayaFullName?: string;
    status: string;
  }): string {
    let prompt = `You are a helpful customer service assistant for an Algerian e-commerce store that handles Cash on Delivery (COD) orders.

Your role:
- Answer customer questions about their orders
- Confirm order details
- Provide delivery information
- Handle order modifications (address changes, cancellations)
- Be polite, professional, and concise
- Respond in the same language as the customer (Arabic, French, or English)
- Keep responses short (2-3 sentences max)

Important:
- Always be helpful and friendly
- If you don't know something, be honest
- For complex issues, tell them a human agent will contact them soon
`;

    if (orderDetails) {
      prompt += `\n\nCurrent order context:
- Order ID: ${orderDetails.orderId}
- Total Amount: ${orderDetails.totalAmount} DZD
- Wilaya: ${orderDetails.wilayaFullName || 'Not specified'}
- Status: ${orderDetails.status}
`;
    }

    return prompt;
  }

  async getConversationHistory(
    orderId: string,
    limit = 10,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const messages = await this.prisma.message.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map((msg) => {
      if (msg.direction === 'INBOUND') {
        return {
          role: 'user' as const,
          content:
            (msg.payload as { text?: { body?: string } })?.text?.body ||
            'Message content unavailable',
        };
      } else {
        // For outbound, try to get the template content or use a placeholder
        return {
          role: 'assistant' as const,
          content: `Order confirmation sent for order ${(msg.placeholders as { orderId?: string })?.orderId || 'N/A'}`,
        };
      }
    });
  }
}

