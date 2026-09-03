import { NextResponse } from "next/server";
import { getLiveDrops } from "@/lib/drops";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getLiveDrops());
}
