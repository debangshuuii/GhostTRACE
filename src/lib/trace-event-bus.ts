import { EventEmitter } from "events";

declare global {
  // eslint-disable-next-line no-var
  var __ghosttrace_event_bus: EventEmitter | undefined;
}

export const traceEventBus: EventEmitter =
  global.__ghosttrace_event_bus || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  global.__ghosttrace_event_bus = traceEventBus;
}

traceEventBus.setMaxListeners(100);
