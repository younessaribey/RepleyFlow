import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addDays, differenceInHours } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { SseService } from '../../sse/sse.service';

@Injectable()
export class TrialsService {
  private readonly logger = new Logger(TrialsService.name);
  private readonly trialDays = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
  ) {}

  async ensureTrial(storeId: string) {
    const existing = await this.prisma.trial.findFirst({
      where: { storeId, status: { in: ['ACTIVE', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.trial.create({
      data: {
        storeId,
        endsAt: addDays(new Date(), this.trialDays),
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleExpiringTrials() {
    const trials = await this.prisma.trial.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: {
          gte: new Date(),
          lte: addDays(new Date(), 1),
        },
      },
      include: { store: true },
    });

    trials.forEach((trial) => {
      const hoursLeft = differenceInHours(trial.endsAt, new Date());
      this.sseService.emit(
        'trial_expiring',
        {
          storeId: trial.storeId,
          endsAt: trial.endsAt,
          hoursLeft,
        },
        trial.storeId,
      );
    });
  }
}
