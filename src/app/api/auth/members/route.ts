import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkspaceRole, ROLE_DEFINITIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    const targetWorkspaceId = workspaceId || (await prisma.workspace.findFirst())?.id;

    if (!targetWorkspaceId) {
      return NextResponse.json({ members: [] });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: targetWorkspaceId },
      include: {
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      workspaceId: m.workspaceId,
      name: m.user.name || "Anonymous User",
      email: m.user.email,
      image: m.user.image,
      role: (m.role || "DEVELOPER") as WorkspaceRole,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ members: formatted });
  } catch (err: any) {
    console.error("Failed to fetch members:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch workspace members" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, email, name, role } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required to invite member" }, { status: 400 });
    }

    const targetRole = (role || "DEVELOPER").toUpperCase() as WorkspaceRole;
    if (!ROLE_DEFINITIONS[targetRole]) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const targetWorkspaceId = workspaceId || (await prisma.workspace.findFirst())?.id;

    if (!targetWorkspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase().trim() },
      create: {
        email: email.toLowerCase().trim(),
        name: name || email.split("@")[0],
        image: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
        globalRole: "MEMBER",
      },
      update: {},
    });

    // Create or update membership
    const membership = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: targetWorkspaceId,
          userId: user.id,
        },
      },
      create: {
        workspaceId: targetWorkspaceId,
        userId: user.id,
        role: targetRole,
        invitedBy: "System Operator",
      },
      update: {
        role: targetRole,
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Invited ${user.email} as ${targetRole}.`,
      member: {
        id: membership.id,
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        image: membership.user.image,
      },
    });
  } catch (err: any) {
    console.error("Failed to invite member:", err);
    return NextResponse.json(
      { error: err.message || "Failed to invite member" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true, message: "Member removed from workspace" });
  } catch (err: any) {
    console.error("Failed to delete member:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete member" },
      { status: 500 }
    );
  }
}
