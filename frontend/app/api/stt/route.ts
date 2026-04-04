import type { NextRequest } from "next/server";
import { proxyFormData } from "../_proxy";

export async function POST(req: NextRequest): Promise<Response> {
  return proxyFormData(req, "/api/stt");
}

