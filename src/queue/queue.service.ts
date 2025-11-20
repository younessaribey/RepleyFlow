import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { QUEUES } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUES.WHATSAPP) private readonly whatsappQueue: Queue,
    @InjectQueue(QUEUES.DELIVERY) private readonly deliveryQueue: Queue,
  ) {}

  enqueueWhatsappJob(
    payload: Record<string, unknown>,
    options: JobsOptions = {},
  ) {
    return this.whatsappQueue.add('send-whatsapp', payload, {
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    });
  }

  enqueueDeliveryJob(
    payload: Record<string, unknown>,
    options: JobsOptions = {},
  ) {
    return this.deliveryQueue.add('dispatch-delivery', payload, {
      removeOnComplete: true,
      ...options,
    });
  }
}
