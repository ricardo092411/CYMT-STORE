import { NextResponse } from "next/server";

export const dynamic = "force-static";

/** Lightweight healthcheck used by the platform runtime. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "cymt-store",
    time: new Date().toISOString(),
  });
}
