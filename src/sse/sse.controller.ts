import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('stream/:storeId')
  stream(@Param('storeId') storeId: string): Observable<MessageEvent> {
    return this.sseService.subscribe(storeId);
  }
}
