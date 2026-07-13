import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class EventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit(eventName: string, payload: Record<string, unknown>): void {
    this.eventEmitter.emit(eventName, payload);
  }

  on(eventName: string, listener: (payload: unknown) => void): void {
    this.eventEmitter.on(eventName, listener);
  }
}
