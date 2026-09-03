import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  return NextResponse.json({ isAdmin: true });
}
