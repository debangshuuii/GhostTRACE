import { prisma } from "@/lib/prisma";

export interface AlertTriggerPayload {
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "GUARDRAIL" | "SWARM_LOOP" | "TOKEN_SPIKE" | "ERROR";
  reason: string;
  agentName: string;
  model: string;
  traceId?: string;
  traceTitle?: string;
  workspaceId?: string | null;
  tokensConsumed?: number;
  cost?: number;
  details?: Record<string, any>;
}

const SEVERITY_LEVELS: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

/**
 * Dispatches alerts asynchronously across configured webhooks (Slack, Discord, Custom).
 */
export async function dispatchAlert(payload: AlertTriggerPayload) {
  try {
    const configs = await prisma.webhookAlertConfig.findMany({
      where: {
        enabled: true,
        OR: [
          { workspaceId: payload.workspaceId || null },
          { workspaceId: null },
        ],
      },
    });

    if (configs.length === 0) return;

    const payloadSeverityLevel = SEVERITY_LEVELS[payload.severity] || 2;

    for (const config of configs) {
      const configMinLevel = SEVERITY_LEVELS[config.minSeverity] || 2;
      if (payloadSeverityLevel < configMinLevel) continue;

      // Filter by category preference
      if (payload.category === "GUARDRAIL" && !config.alertOnGuardrail) continue;
      if (payload.category === "SWARM_LOOP" && !config.alertOnSwarmLoop) continue;
      if (payload.category === "TOKEN_SPIKE" && !config.alertOnTokenSpike) continue;
      if (payload.category === "ERROR" && !config.alertOnError) continue;

      sendWebhook(config.url, config.type, payload).catch((err) =>
        console.warn(`[GhostTRACE Alert Warning] Failed sending to ${config.type} webhook:`, err.message)
      );
    }
  } catch (err: any) {
    console.warn("[GhostTRACE Alert Error] Could not query webhook configs:", err.message);
  }
}

/**
 * Sends a single formatted webhook request.
 */
export async function sendWebhook(
  url: string,
  type: string,
  payload: AlertTriggerPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    let body: any = null;
    const traceUrl = payload.traceId
      ? `http://localhost:3000?traceId=${encodeURIComponent(payload.traceId)}`
      : "http://localhost:3000";

    if (type === "SLACK") {
      const icon = payload.severity === "CRITICAL" ? "🚨" : payload.severity === "HIGH" ? "⚠️" : "ℹ️";
      body = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${icon} GhostTRACE Alert: ${payload.title}`,
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Severity:*\n\`${payload.severity}\`` },
              { type: "mrkdwn", text: `*Category:*\n${payload.category}` },
              { type: "mrkdwn", text: `*Agent:*\n${payload.agentName}` },
              { type: "mrkdwn", text: `*Model:*\n${payload.model}` },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Reason / Violation:*\n> ${payload.reason}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Tokens: *${payload.tokensConsumed || "N/A"}* | Trace: <${traceUrl}|Inspect Run>`,
              },
            ],
          },
        ],
      };
    } else if (type === "DISCORD") {
      const color = payload.severity === "CRITICAL" ? 0xef4444 : payload.severity === "HIGH" ? 0xf59e0b : 0x3b82f6;
      body = {
        embeds: [
          {
            title: `🚨 GhostTRACE Alert: ${payload.title}`,
            description: payload.reason,
            url: traceUrl,
            color,
            fields: [
              { name: "Severity", value: payload.severity, inline: true },
              { name: "Category", value: payload.category, inline: true },
              { name: "Agent", value: payload.agentName, inline: true },
              { name: "Model", value: payload.model, inline: true },
              { name: "Tokens", value: String(payload.tokensConsumed || "N/A"), inline: true },
            ],
            footer: {
              text: `GhostTRACE Observability • Trace ID: ${payload.traceId || "N/A"}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else {
      // Generic JSON webhook
      body = {
        event: "GHOSTTRACE_ALERT",
        timestamp: new Date().toISOString(),
        ...payload,
        traceUrl,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { success: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { success: true, status: res.status };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}
