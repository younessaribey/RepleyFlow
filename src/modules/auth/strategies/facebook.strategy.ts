import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { OAuthProviderType } from '@prisma/client';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('FACEBOOK_CLIENT_ID') ?? 'placeholder',
      clientSecret:
        configService.get<string>('FACEBOOK_CLIENT_SECRET') ?? 'placeholder',
      callbackURL: `${configService.get<string>('APP_URL')}/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails', 'name'],
      scope: ['email'],
    });
  }

  validate(_: string, __: string, profile: Profile) {
    return {
      provider: OAuthProviderType.FACEBOOK,
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
