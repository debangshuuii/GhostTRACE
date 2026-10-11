import { NextResponse } from "next/server";

export async function GET() {
  const models = [
    { id: "gpt-4o", object: "model", created: 1715367049, owned_by: "openai" },
    { id: "gpt-4o-mini", object: "model", created: 1721295790, owned_by: "openai" },
    { id: "deepseek-r1", object: "model", created: 1737331200, owned_by: "deepseek" },
    { id: "claude-3-7-sonnet", object: "model", created: 1740000000, owned_by: "anthropic" },
    { id: "claude-3-5-sonnet", object: "model", created: 1718841600, owned_by: "anthropic" },
    { id: "llama-3.3-70b", object: "model", created: 1733443200, owned_by: "meta" },
  ];

  return NextResponse.json(
    { object: "list", data: models },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
