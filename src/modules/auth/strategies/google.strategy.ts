import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { OAuthProviderType } from '@prisma/client';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? 'placeholder',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ?? 'placeholder',
      callbackURL: `${configService.get<string>('APP_URL')}/auth/google/callback`,
      scope: ['profile', 'email'],
    });
  }

  validate(_: string, __: string, profile: Profile) {
    return {
      provider: OAuthProviderType.GOOGLE,
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
    };
  }
}
