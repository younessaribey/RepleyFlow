import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { Prisma, StorePlatform, YouCanStore } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { TrialsService } from '../trials/trials.service';
import {
  NormalizedOrder,
  NormalizedProduct,
} from '../products/dto/normalized-product.dto';
import { YoucanAuthCallbackDto } from './dto/youcan-auth.dto';

type YoucanStatePayload = {
  userId: string;
  returnUrl?: string;
  exp: number;
  nonce: string;
};

@Injectable()
export class YoucanService {
  private readonly logger = new Logger(YoucanService.name);
  private readonly apiBaseUrl = 'https://api.youcan.shop';
  private readonly authorizeUrl =
    'https://seller-area.youcan.shop/admin/oauth/authorize';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly integrationsService: IntegrationsService,
    private readonly trialsService: TrialsService,
  ) {}

  buildAuthorizationUrl(userId: string, returnUrl?: string) {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();
    const encodedState = encodeURIComponent(
      this.createStateToken(userId, returnUrl),
    );

    const url = new URL(this.authorizeUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.append('scope[]', '*');
    url.searchParams.set('state', encodedState);

    return { url: url.toString() };
  }

  async handleOAuthCallback(dto: YoucanAuthCallbackDto) {
    if (dto.error) {
      return {
        success: false,
        message: dto.error_description ?? dto.error ?? 'Authorization denied',
      };
    }

    if (!dto.code || !dto.state) {
      throw new BadRequestException('Missing OAuth parameters');
    }

    const state = this.parseState(dto.state);
    const tokenResponse = await this.exchangeCode(dto.code);
    const storeDetails = await this.fetchStoreDetails(
      tokenResponse.access_token,
    );

    const remoteIdentifier =
      storeDetails.slug ?? storeDetails.id ?? storeDetails.name;

    if (!remoteIdentifier) {
      throw new BadRequestException(
        'Unable to determine YouCan store identifier',
      );
    }

    const { store, youcanStore } = await this.upsertStoreConnection({
      userId: state.userId,
      storeSlug: remoteIdentifier,
      storeName: storeDetails.name ?? storeDetails.slug,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
    });

    await this.ensureWebhookSubscription(
      youcanStore,
      tokenResponse.access_token,
    );

    return {
      success: true,
      storeId: store.id,
      returnUrl: state.returnUrl,
    };
  }

  async fetchProductsForStore(storeId: string): Promise<NormalizedProduct[]> {
    const connection = await this.prisma.youCanStore.findFirst({
      where: { storeRecordId: storeId },
    });

    if (!connection) {
      this.logger.warn(`No YouCan credentials found for store ${storeId}`);
      return [];
    }

    const accessToken = await this.getActiveAccessToken(connection).catch(
      (error) => {
        this.logger.error(
          `Failed to resolve YouCan token for store ${storeId}`,
          error as Error,
        );
        return null;
      },
    );

    if (!accessToken) {
      return [];
    }

    try {
      const response = await axios.get(`${this.apiBaseUrl}/v1/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 250 },
      });

      return (response.data?.data ?? []).map((product) => {
        const amount =
          product.price?.amount !== undefined && product.price?.amount !== null
            ? Number(product.price.amount)
            : Number(product.price ?? 0);

        return {
          externalId: product.id?.toString(),
          title: product.title ?? product.name,
          price: amount,
          currency: product.price?.currency ?? 'DZD',
          sku: product.sku,
          images: product.images,
          metadata: {
            status: product.status,
            tags: product.tags,
          },
        };
      });
    } catch (error) {
      this.logger.error('Failed to fetch YouCan products', error as Error);
      return [];
    }
  }

  normalizeOrder(payload: any): NormalizedOrder {
    const customer = payload?.customer ?? {};
    const shippingPayload = payload?.shipping?.payload ?? {};

    return {
      externalId: payload?.id?.toString() ?? payload?.ref,
      customerName:
        `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
        shippingPayload?.name ||
        undefined,
      customerPhone: customer.phone,
      customerAddress: shippingPayload?.display_name ?? undefined,
      wilayaFullName: shippingPayload?.name ?? payload?.shipping?.status_text,
      totalAmount: Number(payload?.total ?? 0),
      currency: payload?.currency ?? 'DZD',
      deliveryPrice: Number(payload?.shipping?.price ?? 0) || undefined,
      products: (payload?.variants ?? []).map((variant) => ({
        externalId: variant?.id?.toString(),
        name:
          variant?.variant?.product?.name ??
          variant?.variant?.name ??
          variant?.name ??
          'Unknown product',
        price: Number(variant?.price ?? 0),
        quantity: Number(variant?.quantity ?? 1),
        metadata: {
          sku: variant?.variant?.sku,
        },
      })),
    };
  }

  isCodOrder(payload: any) {
    return (
      payload?.payment?.payload?.gateway?.toLowerCase?.() === 'cod' ||
      payload?.payment?.gateway === 'cod'
    );
  }

  assertValidSignature(signature: string, payload: any) {
    const clientSecret = this.getClientSecret();
    const expected = createHmac('sha256', clientSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const provided = signature?.trim() ?? '';

    if (
      !provided ||
      expected.length !== provided.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
    ) {
      throw new UnauthorizedException('Invalid YouCan signature');
    }
  }

  private async exchangeCode(code: string) {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/oauth/token`, {
        grant_type: 'authorization_code',
        client_id: this.getClientId(),
        client_secret: this.getClientSecret(),
        redirect_uri: this.getRedirectUri(),
        code,
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange YouCan auth code', error as Error);
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  private async fetchStoreDetails(accessToken: string) {
    const response = await axios.get(`${this.apiBaseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data ?? {};
  }

  private async upsertStoreConnection(params: {
    userId: string;
    storeSlug: string;
    storeName: string;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  }) {
    const slug = params.storeSlug.toString();
    const domain = `${slug}.youcan.shop`;

    let store = await this.prisma.store.findFirst({
      where: {
        userId: params.userId,
        platform: StorePlatform.YOUCAN,
        domain,
      },
    });

    if (!store) {
      store = await this.prisma.store.create({
        data: {
          userId: params.userId,
          platform: StorePlatform.YOUCAN,
          name: params.storeName,
          domain,
          timezone: 'Africa/Algiers',
        },
      });
      await this.integrationsService.createForStore(store);
      await this.trialsService.ensureTrial(store.id);
    } else {
      store = await this.prisma.store.update({
        where: { id: store.id },
        data: { name: params.storeName },
      });

      const integration = await this.integrationsService.findByStoreId(
        store.id,
      );
      if (!integration) {
        await this.integrationsService.createForStore(store);
      }
    }

    const expiresAt = this.computeExpiry(params.expiresIn);
    const encryptedAccess = this.encryptionService.encrypt(params.accessToken);
    const encryptedRefresh = this.encryptionService.encrypt(
      params.refreshToken,
    );

    const existing = await this.prisma.youCanStore.findFirst({
      where: { storeId: slug, userId: params.userId },
    });

    const data: Prisma.YouCanStoreUncheckedCreateInput = {
      storeId: slug,
      storeName: params.storeName,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiresAt: expiresAt,
      webhookSecret: existing?.webhookSecret ?? randomBytes(32).toString('hex'),
      userId: params.userId,
      storeRecordId: store.id,
    };

    const youcanStore = existing
      ? await this.prisma.youCanStore.update({
          where: { id: existing.id },
          data: {
            storeName: data.storeName,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            tokenExpiresAt: data.tokenExpiresAt,
            storeRecordId: data.storeRecordId,
          },
        })
      : await this.prisma.youCanStore.create({ data });

    return { store, youcanStore };
  }

  private async ensureWebhookSubscription(
    youcanStore: YouCanStore,
    accessToken: string,
  ) {
    const targetUrl = `${this.getAppBaseUrl()}/api/youcan/webhook?token=${youcanStore.webhookSecret}`;

    try {
      await axios.post(
        `${this.apiBaseUrl}/resthooks/subscribe`,
        {
          event: 'order.create',
          target_url: targetUrl,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      this.logger.log(
        `Registered YouCan order.create webhook for store ${youcanStore.storeId}`,
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        this.logger.warn('YouCan webhook already registered');
        return;
      }
      this.logger.error('Failed to register YouCan webhook', error as Error);
    }
  }

  private createStateToken(userId: string, returnUrl?: string) {
    const payload: YoucanStatePayload = {
      userId,
      returnUrl,
      exp: Date.now() + 15 * 60 * 1000,
      nonce: randomBytes(8).toString('hex'),
    };
    return this.encryptionService.encrypt(JSON.stringify(payload));
  }

  private parseState(state: string): YoucanStatePayload {
    try {
      const decoded = decodeURIComponent(state);
      const decrypted = this.encryptionService.decrypt(decoded);
      if (!decrypted) {
        throw new Error('state decryption failed');
      }
      const payload = JSON.parse(decrypted) as YoucanStatePayload;
      if (!payload.userId || payload.exp < Date.now()) {
        throw new Error('state expired');
      }
      return payload;
    } catch (error) {
      this.logger.error('Failed to parse YouCan OAuth state', error as Error);
      throw new BadRequestException('Invalid OAuth state');
    }
  }

  private getRedirectUri() {
    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    return `${appUrl.replace(/\/$/, '')}/api/youcan/oauth/callback`;
  }

  private getAppBaseUrl() {
    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    return appUrl.replace(/\/$/, '');
  }

  private getClientId() {
    const clientId = this.configService.get<string>('YOUCAN_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Missing YOUCAN_CLIENT_ID');
    }
    return clientId;
  }

  private getClientSecret() {
    const secret = this.configService.get<string>('YOUCAN_CLIENT_SECRET');
    if (!secret) {
      throw new BadRequestException('Missing YOUCAN_CLIENT_SECRET');
    }
    return secret;
  }

  private computeExpiry(expiresIn?: number) {
    const ttl = expiresIn ?? 60 * 60; // default 1h
    return new Date(Date.now() + ttl * 1000);
  }

  private async getActiveAccessToken(connection: YouCanStore) {
    const now = Date.now();
    const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
    const bufferMs = 60 * 1000;

    if (expiresAt - bufferMs > now) {
      return this.encryptionService.decrypt(connection.accessToken);
    }

    return this.refreshAccessToken(connection);
  }

  private async refreshAccessToken(connection: YouCanStore) {
    const refresh = this.encryptionService.decrypt(connection.refreshToken);
    if (!refresh) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const response = await axios
      .post(`${this.apiBaseUrl}/oauth/token`, {
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: this.getClientId(),
        client_secret: this.getClientSecret(),
      })
      .catch((error) => {
        this.logger.error('Failed to refresh YouCan token', error as Error);
        throw new UnauthorizedException('Unable to refresh YouCan token');
      });

    const data = response.data;
    const updated = await this.prisma.youCanStore.update({
      where: { id: connection.id },
      data: {
        accessToken: this.encryptionService.encrypt(data.access_token),
        refreshToken: this.encryptionService.encrypt(
          data.refresh_token ?? refresh,
        ),
        tokenExpiresAt: this.computeExpiry(data.expires_in),
      },
    });

    return this.encryptionService.decrypt(updated.accessToken);
  }
}
