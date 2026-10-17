import { NextResponse } from "next/server";
import { sendWebhook } from "@/lib/alert-dispatcher";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    let { url, type = "SLACK" } = body;

    // If ID is provided, look up the configured webhook from database
    if ((!url || typeof url !== "string" || !url.trim()) && id) {
      const config = await prisma.webhookAlertConfig.findUnique({
        where: { id },
      });
      if (config) {
        url = config.url;
        type = config.type;
      }
    }

    if (!url || typeof url !== "string" || !url.trim().startsWith("http")) {
      return NextResponse.json(
        { error: "A valid webhook URL starting with http:// or https:// is required" },
        { status: 400 }
      );
    }

    const cleanUrl = url.trim();

    // Auto-detect provider if URL clearly indicates Discord or Slack
    let effectiveType = (type || "SLACK").toUpperCase();
    if (cleanUrl.includes("discord.com/api/webhooks")) {
      effectiveType = "DISCORD";
    } else if (cleanUrl.includes("hooks.slack.com")) {
      effectiveType = "SLACK";
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

    const result = await sendWebhook(cleanUrl, effectiveType, testPayload);

    if (!result.success) {
      return NextResponse.json(
        { error: `Webhook dispatch failed: ${result.error || `HTTP ${result.status}`}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test alert dispatched to ${effectiveType} webhook successfully!`,
    });
  } catch (err: any) {
    console.error("Test alert error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to dispatch test alert" },
      { status: 500 }
    );
  }
}

