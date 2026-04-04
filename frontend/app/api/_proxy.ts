import type { NextRequest } from "next/server";

export function getBackendBase(): string {
  // Prefer a server-only env var; fall back to the existing public one for convenience.
  return process.env.API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
}

export async function proxyJson(req: NextRequest, backendPath: string): Promise<Response> {
  const backendBase = getBackendBase();
  const url = new URL(backendPath, backendBase).toString();

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      // Forward content-type when present (e.g. application/json)
      ...(req.headers.get("content-type") ? { "content-type": req.headers.get("content-type")! } : {})
    },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer()
  });

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": contentType
    }
  });
}

export async function proxyFormData(req: NextRequest, backendPath: string): Promise<Response> {
  const backendBase = getBackendBase();
  const url = new URL(backendPath, backendBase).toString();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "Invalid multipart/form-data", detail: msg }, { status: 400 });
  }

  const upstream = await fetch(url, {
    method: "POST",
    body: formData
  });

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": contentType
    }
  });
}

