import { NextResponse } from "next/server";
import { sendWebhook } from "@/lib/alert-dispatcher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, type = "SLACK" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
    }

    const testPayload = {
      title: "Test Alert: Verification Beacon",
      severity: "HIGH" as const,
      category: "GUARDRAIL" as const,
      reason: "This is a test notification confirming GhostTRACE webhook alerting is active.",
      agentName: "GhostTRACE-Monitor",
      model: "deepseek-r1",
      traceId: "test-beacon-run",
      traceTitle: "Zero-Trust Security Verification",
      tokensConsumed: 120,
    };

    const result = await sendWebhook(url, type, testPayload);

    if (!result.success) {
      return NextResponse.json(
        { error: `Webhook dispatch failed: ${result.error || `HTTP ${result.status}`}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: `Test alert dispatched to ${type} webhook successfully!` });
  } catch (err: any) {
    console.error("Test alert error:", err);
    return NextResponse.json({ error: err.message || "Failed to dispatch test alert" }, { status: 500 });
  }
}
