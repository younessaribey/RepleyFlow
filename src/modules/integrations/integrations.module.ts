import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  providers: [IntegrationsService, EncryptionService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
