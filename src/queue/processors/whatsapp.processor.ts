import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WhatsappService } from '../../modules/whatsapp/whatsapp.service';
import { QUEUES } from '../queue.constants';

@Processor(QUEUES.WHATSAPP)
export class WhatsappProcessor extends WorkerHost {
  constructor(private readonly whatsappService: WhatsappService) {
    super();
  }

  async process(job: Job) {
    if (job.name === 'send-whatsapp') {
      await this.whatsappService.sendTemplateMessage(job.data);
    }
  }
}
