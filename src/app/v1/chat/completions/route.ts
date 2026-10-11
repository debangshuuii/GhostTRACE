import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth-guard";
import { createProxyTrace } from "@/lib/proxy-tracer";

export const maxDuration = 60; // Allow long-running reasoning model streams

// Handle CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const rawAuth = req.headers.get("authorization") || req.headers.get("x-api-key") || "";
    let ghostWorkspaceId: string | null = null;

    // Check if client provided a GhostTRACE credential (gt_live_ / gt_test_)
    if (rawAuth.includes("gt_live_") || rawAuth.includes("gt_test_")) {
      const auth = await validateApiKey(req);
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error || "Invalid GhostTRACE API key" }, { status: 401 });
      }
      ghostWorkspaceId = auth.apiKey?.workspaceId || null;
    }

    const body = await req.json();
    const { model = "gpt-4o", messages = [], stream = false, tools, tool_choice } = body;

    // Upstream Resolution
    const upstreamBaseUrl =
      req.headers.get("x-upstream-base-url") ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1";

    let upstreamKey = req.headers.get("x-upstream-key") || process.env.OPENAI_API_KEY || "";
    if (!upstreamKey && rawAuth && !rawAuth.includes("gt_live_") && !rawAuth.includes("gt_test_")) {
      upstreamKey = rawAuth.startsWith("Bearer ") ? rawAuth.slice(7).trim() : rawAuth.trim();
    }

    const customTitle = req.headers.get("x-ghosttrace-title");
    const agentName = req.headers.get("x-ghosttrace-agent") || "OpenAI-Proxy-Agent";
    const tagsHeader = req.headers.get("x-ghosttrace-tags");
    const customTags = tagsHeader ? tagsHeader.split(",").map((t) => t.trim()) : [];
    const workspaceId = req.headers.get("x-workspace-id") || ghostWorkspaceId;

    // Local Simulation Mode (fallback when no API key is provided and targeting default OpenAI)
    const isLocalSimulated =
      !upstreamKey && upstreamBaseUrl.includes("api.openai.com");

    if (isLocalSimulated) {
      const promptSnippet =
        messages[messages.length - 1]?.content || "Simulation Query";
      const simulatedReasoning =
        `1. Deconstructed intent: "${String(promptSnippet).slice(0, 60)}".\n` +
        `2. Formulated safety constraints and evaluated tool selection.\n` +
        `3. Verified output against zero-trust policy invariants.`;
      const simulatedAnswer =
        `[GhostTRACE Simulated Response]: Successfully processed your request through the Zero-Code OpenAI Tracing Proxy.\n\n` +
        `To route to live upstream models, supply your OpenAI/DeepSeek key via 'Authorization: Bearer sk-...' or 'x-upstream-key'.`;

      const durationMs = 280;
      const trace = await createProxyTrace({
        model,
        messages,
        responseContent: simulatedAnswer,
        reasoningContent: simulatedReasoning,
        toolCalls: tools?.length ? [{ name: "search", arguments: "{ \"q\": \"ghosttrace\" }" }] : undefined,
        usage: { prompt_tokens: 45, completion_tokens: 95, total_tokens: 140 },
        durationMs,
        workspaceId,
        customTitle,
        agentName,
        tags: [...customTags, "simulated"],
      });

      if (stream) {
        // Stream simulated chunks
        const encoder = new TextEncoder();
        const streamResponse = new ReadableStream({
          start(controller) {
            const chunkId = `chatcmpl-${trace.id}`;
            const chunk1 = {
              id: chunkId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [{ delta: { role: "assistant", content: simulatedAnswer }, index: 0, finish_reason: null }],
            };
            const chunk2 = {
              id: chunkId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk1)}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk2)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        return new Response(streamResponse, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "x-ghosttrace-id": trace.id,
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return NextResponse.json(
        {
          id: `chatcmpl-${trace.id}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: simulatedAnswer,
                reasoning_content: simulatedReasoning,
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 45,
            completion_tokens: 95,
            total_tokens: 140,
          },
        },
        {
          headers: {
            "x-ghosttrace-id": trace.id,
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Call Real Upstream API
    const upstreamUrl = `${upstreamBaseUrl.replace(/\/+$/, "")}/chat/completions`;
    const upstreamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (upstreamKey) {
      upstreamHeaders["Authorization"] = `Bearer ${upstreamKey}`;
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(body),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      const durationMs = Date.now() - startTime;
      await createProxyTrace({
        model,
        messages,
        durationMs,
        workspaceId,
        customTitle,
        agentName,
        tags: customTags,
        status: "FAILED",
        errorMessage: `Upstream error (${upstreamRes.status}): ${errText.slice(0, 300)}`,
      });

      return new Response(errText, {
        status: upstreamRes.status,
        headers: {
          "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Handle Streaming Response
    if (stream && upstreamRes.body) {
      let accumulatedContent = "";
      let accumulatedReasoning = "";
      const accumulatedToolCalls: any[] = [];
      const decoder = new TextDecoder();
      const reader = upstreamRes.body.getReader();

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk);
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data:") && !trimmed.includes("[DONE]")) {
              try {
                const parsed = JSON.parse(trimmed.slice(5).trim());
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.content) accumulatedContent += delta.content;
                if (delta?.reasoning_content) accumulatedReasoning += delta.reasoning_content;
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    if (!accumulatedToolCalls[idx]) {
                      accumulatedToolCalls[idx] = { id: tc.id, function: { name: "", arguments: "" } };
                    }
                    if (tc.function?.name) accumulatedToolCalls[idx].function.name += tc.function.name;
                    if (tc.function?.arguments) accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
                  }
                }
              } catch {
                // Ignore chunk parse anomalies
              }
            }
          }
        },
        async flush() {
          const durationMs = Date.now() - startTime;
          try {
            await createProxyTrace({
              model,
              messages,
              responseContent: accumulatedContent,
              reasoningContent: accumulatedReasoning,
              toolCalls: accumulatedToolCalls.filter(Boolean),
              durationMs,
              workspaceId,
              customTitle,
              agentName,
              tags: customTags,
            });
          } catch (traceErr) {
            console.error("Failed to persist streaming proxy trace:", traceErr);
          }
        },
      });

      const readable = upstreamRes.body.pipeThrough(transformStream);

      return new Response(readable, {
        status: upstreamRes.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Handle Non-Streaming JSON Response
    const responseJson = await upstreamRes.json();
    const durationMs = Date.now() - startTime;

    const choice = responseJson.choices?.[0];
    const message = choice?.message;
    const responseContent = message?.content || "";
    const reasoningContent = message?.reasoning_content || message?.reasoning || "";
    const toolCalls = message?.tool_calls || [];

    const trace = await createProxyTrace({
      model,
      messages,
      responseContent,
      reasoningContent,
      toolCalls,
      usage: responseJson.usage,
      durationMs,
      workspaceId,
      customTitle,
      agentName,
      tags: customTags,
    });

    return NextResponse.json(responseJson, {
      status: 200,
      headers: {
        "x-ghosttrace-id": trace.id,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    console.error("Proxy completion error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Proxy Error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
