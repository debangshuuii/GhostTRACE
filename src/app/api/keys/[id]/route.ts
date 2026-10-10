import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to revoke API key:", error);
    return NextResponse.json({ error: error.message || "Failed to revoke API key" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        status: status || "REVOKED",
      },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    console.error("Failed to update API key status:", error);
    return NextResponse.json({ error: error.message || "Failed to update API key" }, { status: 500 });
  }
}
