import type { NextRequest } from "next/server";
import { getBackendBase } from "../_proxy";

export async function POST(req: NextRequest): Promise<Response> {
  const backendBase = getBackendBase();
  const url = new URL("/api/tts", backendBase).toString();

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: await req.text()
  });

  const contentType = upstream.headers.get("content-type") ?? "audio/wav";
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": contentType
    }
  });
}

