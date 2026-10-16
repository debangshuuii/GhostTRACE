import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserSessionData, WorkspaceRole, ROLE_DEFINITIONS } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    // Ensure a default admin user exists
    let user = await prisma.user.findFirst({
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Debangshu Sinha",
          email: "debangshu@ghosttrace.io",
          image: "https://avatars.githubusercontent.com/u/1024025?v=4",
          globalRole: "SUPER_ADMIN",
          accounts: {
            create: {
              provider: "github",
              providerAccountId: "github-debangshu-1024",
            },
          },
        },
        include: {
          memberships: {
            include: { workspace: true },
          },
        },
      });
    }

    // Get active workspace or create default
    let activeWorkspace = null;
    if (workspaceId) {
      activeWorkspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
    }

    if (!activeWorkspace) {
      activeWorkspace = await prisma.workspace.findFirst();
      if (!activeWorkspace) {
        activeWorkspace = await prisma.workspace.create({
          data: {
            name: "GhostTRACE Cloud Fleet",
            slug: "ghosttrace-cloud-fleet",
            environment: "production",
          },
        });
      }
    }

    // Ensure membership in this workspace
    let membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: activeWorkspace.id,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      membership = await prisma.workspaceMember.create({
        data: {
          workspaceId: activeWorkspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    const userRole = (membership.role || "OWNER") as WorkspaceRole;
    const permissions = ROLE_DEFINITIONS[userRole]?.permissions || [];

    const sessionData: UserSessionData = {
      user: {
        id: user.id,
        name: user.name || "Anonymous Agent",
        email: user.email,
        image: user.image,
        provider: "github",
      },
      currentWorkspace: {
        id: activeWorkspace.id,
        name: activeWorkspace.name,
        slug: activeWorkspace.slug,
        environment: activeWorkspace.environment,
        userRole,
      },
      permissions,
    };

    return NextResponse.json(sessionData);
  } catch (err: any) {
    console.error("Session error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load authentication session" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "switch_role";

    if (action === "switch_role") {
      const { role, workspaceId } = body;
      const targetRole = (role || "DEVELOPER").toUpperCase() as WorkspaceRole;

      if (!ROLE_DEFINITIONS[targetRole]) {
        return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
      }

      const user = await prisma.user.findFirst();
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const ws = workspaceId
        ? await prisma.workspace.findUnique({ where: { id: workspaceId } })
        : await prisma.workspace.findFirst();

      if (!ws) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }

      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: ws.id,
            userId: user.id,
          },
        },
        create: {
          workspaceId: ws.id,
          userId: user.id,
          role: targetRole,
        },
        update: {
          role: targetRole,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Switched active role in [${ws.name}] to ${targetRole}.`,
        role: targetRole,
        permissions: ROLE_DEFINITIONS[targetRole].permissions,
      });
    }

    if (action === "mock_oauth_login") {
      const { provider, name, email, avatar } = body;
      const oauthProvider = provider === "google" ? "google" : "github";

      const upsertedUser = await prisma.user.upsert({
        where: { email: email || `${oauthProvider}-user@ghosttrace.io` },
        create: {
          name: name || (oauthProvider === "google" ? "Google Enterprise User" : "GitHub Developer"),
          email: email || `${oauthProvider}-user@ghosttrace.io`,
          image: avatar || (oauthProvider === "google" ? "https://lh3.googleusercontent.com/a/default-user" : "https://avatars.githubusercontent.com/u/9919?v=4"),
          globalRole: "ADMIN",
          accounts: {
            create: {
              provider: oauthProvider,
              providerAccountId: `${oauthProvider}-${Date.now()}`,
            },
          },
        },
        update: {
          name: name,
          image: avatar,
        },
      });

      const ws = await prisma.workspace.findFirst();
      if (ws) {
        await prisma.workspaceMember.upsert({
          where: {
            workspaceId_userId: {
              workspaceId: ws.id,
              userId: upsertedUser.id,
            },
          },
          create: {
            workspaceId: ws.id,
            userId: upsertedUser.id,
            role: "ADMIN",
          },
          update: {
            role: "ADMIN",
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Authenticated via OAuth ${oauthProvider.toUpperCase()}.`,
        user: upsertedUser,
      });
    }

    return NextResponse.json({ error: "Unknown auth action" }, { status: 400 });
  } catch (err: any) {
    console.error("Auth action error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process auth request" },
      { status: 500 }
    );
  }
}
