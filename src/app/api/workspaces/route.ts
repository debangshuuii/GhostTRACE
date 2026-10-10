import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { traces: true, apiKeys: true },
        },
      },
    });

    // Seed initial default workspaces if database is fresh
    if (workspaces.length === 0) {
      await prisma.workspace.createMany({
        data: [
          { name: "Production Fleet", slug: "production-fleet", environment: "production" },
          { name: "Staging Swarms", slug: "staging-swarms", environment: "staging" },
          { name: "Security & Red Team", slug: "security-audit", environment: "staging" },
          { name: "Local Development", slug: "local-dev", environment: "development" },
        ],
      });

      workspaces = await prisma.workspace.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          _count: {
            select: { traces: true, apiKeys: true },
          },
        },
      });
    }

    return NextResponse.json({ success: true, workspaces });
  } catch (error: any) {
    console.error("Failed to list workspaces:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list workspaces" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, environment = "production" } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        environment,
      },
    });

    return NextResponse.json({ success: true, workspace }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create workspace:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create workspace" },
      { status: 500 }
    );
  }
}
