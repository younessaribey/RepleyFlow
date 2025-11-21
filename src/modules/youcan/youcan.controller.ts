import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import { YoucanService } from './youcan.service';
import {
  YoucanAuthCallbackDto,
  YoucanAuthStartDto,
} from './dto/youcan-auth.dto';

@Controller('youcan')
export class YoucanController {
  constructor(
    private readonly youcanService: YoucanService,
    private readonly configService: ConfigService,
  ) {}

  @Get('oauth/start')
  @UseGuards(JwtAuthGuard)
  startOAuth(
    @CurrentUser() user: CurrentUserType,
    @Query() dto: YoucanAuthStartDto,
  ) {
    return this.youcanService.buildAuthorizationUrl(user.id, dto.returnUrl);
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query() dto: YoucanAuthCallbackDto,
    @Res() res: Response,
  ) {
    let result: {
      success: boolean;
      message?: string;
      returnUrl?: string;
      storeId?: string;
    };

    try {
      result = await this.youcanService.handleOAuthCallback(dto);
    } catch (error) {
      result = {
        success: false,
        message: error instanceof Error ? error.message : 'YouCan OAuth failed',
      };
    }

    const target =
      this.configService.get<string>('FRONTEND_URL') ??
      this.configService.get<string>('APP_URL') ??
      'http://localhost:3001';

    const redirect = new URL(target);
    redirect.pathname = '/integrations/youcan';
    redirect.searchParams.set('status', result.success ? 'success' : 'error');

    if (result.message) {
      redirect.searchParams.set('message', result.message);
    }

    if (result.returnUrl) {
      redirect.searchParams.set('next', result.returnUrl);
    }

    if (result.storeId) {
      redirect.searchParams.set('storeId', result.storeId);
    }

    return res.redirect(redirect.toString());
  }
}
