import { NextResponse } from "next/server";
import { getDrops } from "@/lib/drops";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getDrops());
}
