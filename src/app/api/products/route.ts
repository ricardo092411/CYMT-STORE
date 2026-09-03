import { NextResponse } from "next/server";
import { getPublicProductsWithVariants } from "@/lib/products";

export const dynamic = "force-dynamic";

/** Public catalog read path. Administrative mutations stay under /api/admin. */
export async function GET() {
  try {
    return NextResponse.json(await getPublicProductsWithVariants());
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error obteniendo productos" },
      { status: 500 },
    );
  }
}
