import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { hashApiKey } from "@/lib/auth-guard";

export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPreview: true,
        environment: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, keys });
  } catch (error: any) {
    console.error("Failed to list API keys:", error);
    return NextResponse.json({ error: error.message || "Failed to list API keys" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name = "Production Agent Ingestion Key", environment = "production" } = body;

    const prefix = environment === "production" ? "gt_live" : "gt_test";
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const fullKey = `${prefix}_${randomBytes}`;
    const keyPreview = `${prefix}_••••••••${fullKey.slice(-4)}`;

    const newKey = await prisma.apiKey.create({
      data: {
        name,
        keyPreview,
        keySecret: hashApiKey(fullKey),
        environment,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(
      {
        success: true,
        key: {
          id: newKey.id,
          name: newKey.name,
          keyPreview: newKey.keyPreview,
          environment: newKey.environment,
          status: newKey.status,
          createdAt: newKey.createdAt,
        },
        fullKey, // Returned only upon creation
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create API key:", error);
    return NextResponse.json({ error: error.message || "Failed to create API key" }, { status: 500 });
  }
}
