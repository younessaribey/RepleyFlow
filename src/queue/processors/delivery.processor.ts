import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DeliveryService } from '../../modules/delivery/delivery.service';
import { QUEUES } from '../queue.constants';

@Processor(QUEUES.DELIVERY)
export class DeliveryProcessor extends WorkerHost {
  constructor(private readonly deliveryService: DeliveryService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== 'dispatch-delivery') return;
    const orderId = job.data?.orderId as string | undefined;
    const partner = job.data?.partner as string | undefined;
    if (orderId) {
      await this.deliveryService.dispatchOrder(orderId, partner);
    }
  }
}
