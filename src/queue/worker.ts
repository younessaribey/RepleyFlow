import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('QueueWorker');
  logger.log('Queue worker is running');

  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) =>
    process.on(signal, async () => {
      await app.close();
      process.exit(0);
    }),
  );
}

bootstrap().catch((error) => {
  console.error('Queue worker failed to start', error);
  process.exit(1);
});
