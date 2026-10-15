import { NextResponse } from "next/server";
import { generatePhantomResponse } from "@/lib/phantom-ai-engine";
import { TraceRunData, TraceNodeData } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, trace, selectedNode, history } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required." },
        { status: 400 }
      );
    }

    // Generate solution response
    const assistantMessage = generatePhantomResponse(
      prompt,
      (trace as TraceRunData) || null,
      (selectedNode as TraceNodeData) || null
    );

    return NextResponse.json({
      success: true,
      message: assistantMessage,
    });
  } catch (err: any) {
    console.error("Error in PhantomAI endpoint:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
