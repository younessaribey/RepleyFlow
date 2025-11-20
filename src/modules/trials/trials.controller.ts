import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TrialsService } from './trials.service';

@Controller('trials')
@UseGuards(JwtAuthGuard)
export class TrialsController {
  constructor(private readonly trialsService: TrialsService) {}

  @Get(':storeId')
  getTrial(@Param('storeId') storeId: string) {
    return this.trialsService.ensureTrial(storeId);
  }
}
