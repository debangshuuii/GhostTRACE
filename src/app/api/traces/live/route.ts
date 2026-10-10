import { traceEventBus } from "@/lib/trace-event-bus";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Initial connection ping
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`));

      const onTraceEvent = (payload: any) => {
        try {
          controller.enqueue(
            encoder.encode(`event: trace_update\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch (err) {
          console.warn("Error streaming trace SSE event:", err);
        }
      };

      traceEventBus.on("trace_update", onTraceEvent);

      // Heartbeat every 15s to prevent socket timeouts
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        traceEventBus.off("trace_update", onTraceEvent);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
