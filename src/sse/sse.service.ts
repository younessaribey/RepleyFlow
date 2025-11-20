import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SseService {
  private readonly storeStreams = new Map<string, Set<Subject<MessageEvent>>>();

  subscribe(storeId: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    const existing = this.storeStreams.get(storeId) ?? new Set();
    existing.add(subject);
    this.storeStreams.set(storeId, existing);

    const subscription = subject.subscribe({
      complete: () => this.cleanup(storeId, subject),
      error: () => this.cleanup(storeId, subject),
    });

    return new Observable<MessageEvent>((observer) => {
      const sub = subject.subscribe(observer);
      return () => {
        sub.unsubscribe();
        subscription.unsubscribe();
        this.cleanup(storeId, subject);
      };
    });
  }

  emit(event: string, payload: unknown, storeId?: string) {
    if (storeId) {
      this.publishToStore(storeId, event, payload);
      return;
    }

    for (const key of this.storeStreams.keys()) {
      this.publishToStore(key, event, payload);
    }
  }

  private publishToStore(storeId: string, event: string, payload: unknown) {
    const subjects = this.storeStreams.get(storeId);
    if (!subjects) return;

    subjects.forEach((subject) =>
      subject.next({
        data: JSON.stringify({ event, payload }),
        type: event,
      }),
    );
  }

  private cleanup(storeId: string, subject: Subject<MessageEvent>) {
    const subjects = this.storeStreams.get(storeId);
    if (!subjects) return;

    subjects.delete(subject);
    if (subjects.size === 0) {
      this.storeStreams.delete(storeId);
    }
  }
}
