import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateAnnotationSchema = z.object({
  nodeId: z.string().min(1, "Node ID is required"),
  author: z.string().default("Operator"),
  content: z.string().min(1, "Annotation content is required"),
  sentiment: z
    .enum(["PRAISE", "WARNING", "VETO_DISPUTE", "BUG", "NEUTRAL"])
    .default("NEUTRAL"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const nodeId = searchParams.get("nodeId");

    const where: any = { traceRunId: id };
    if (nodeId) {
      where.nodeId = nodeId;
    }

    const annotations = await prisma.traceAnnotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(annotations);
  } catch (error: any) {
    console.error("Failed to fetch annotations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch annotations" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = CreateAnnotationSchema.parse(body);

    const annotation = await prisma.traceAnnotation.create({
      data: {
        traceRunId: id,
        nodeId: validated.nodeId,
        author: validated.author,
        content: validated.content,
        sentiment: validated.sentiment,
      },
    });

    return NextResponse.json(annotation, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create annotation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create annotation" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: traceRunId } = await params;
    const { searchParams } = new URL(req.url);
    const annotationId = searchParams.get("annotationId");

    if (!annotationId) {
      return NextResponse.json(
        { error: "annotationId query parameter is required" },
        { status: 400 }
      );
    }

    await prisma.traceAnnotation.deleteMany({
      where: {
        id: annotationId,
        traceRunId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete annotation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete annotation" },
      { status: 500 }
    );
  }
}
