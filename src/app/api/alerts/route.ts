import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const where: any = {};
    if (workspaceId) {
      where.OR = [{ workspaceId }, { workspaceId: null }];
    }

    const configs = await prisma.webhookAlertConfig.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(configs);
  } catch (err: any) {
    console.error("Failed to load alert configs:", err);
    return NextResponse.json({ error: err.message || "Failed to load alert configs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name = "Slack / Discord Webhook",
      url,
      type = "SLACK",
      enabled = true,
      alertOnGuardrail = true,
      alertOnSwarmLoop = true,
      alertOnTokenSpike = true,
      alertOnError = true,
      minSeverity = "HIGH",
      workspaceId,
    } = body;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json({ error: "A valid webhook URL (http/https) is required" }, { status: 400 });
    }

    if (id) {
      // Update existing
      const updated = await prisma.webhookAlertConfig.update({
        where: { id },
        data: {
          name,
          url,
          type,
          enabled,
          alertOnGuardrail,
          alertOnSwarmLoop,
          alertOnTokenSpike,
          alertOnError,
          minSeverity,
          workspaceId: workspaceId || null,
        },
      });
      return NextResponse.json(updated);
    }

    // Create new
    const created = await prisma.webhookAlertConfig.create({
      data: {
        name,
        url,
        type,
        enabled,
        alertOnGuardrail,
        alertOnSwarmLoop,
        alertOnTokenSpike,
        alertOnError,
        minSeverity,
        workspaceId: workspaceId || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Failed to save alert config:", err);
    return NextResponse.json({ error: err.message || "Failed to save alert config" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing config ID" }, { status: 400 });
    }

    await prisma.webhookAlertConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("Failed to delete alert config:", err);
    return NextResponse.json({ error: err.message || "Failed to delete alert config" }, { status: 500 });
  }
}
