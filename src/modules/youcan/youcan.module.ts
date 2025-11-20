import { Module } from '@nestjs/common';
import { YoucanService } from './youcan.service';

@Module({
  providers: [YoucanService],
  exports: [YoucanService],
})
export class YoucanModule {}
