import { NextResponse } from "next/server";
import { clubMembers } from "@/db/schema";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Club CYMT signup.
 * Persists the member to PostgreSQL (email is unique; duplicates are ignored).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const data = body as {
    name?: unknown;
    email?: unknown;
    interests?: unknown;
  };

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 400 });
  }

  const name =
    typeof data.name === "string" && data.name.trim().length > 0
      ? data.name.trim().slice(0, 160)
      : null;

  const interests = Array.isArray(data.interests)
    ? data.interests.filter((v): v is string => typeof v === "string").slice(0, 20)
    : [];

  try {
    /* Desarrollo sin PostgreSQL: mantenemos el contrato de éxito del cliente
       y evitamos evaluar el módulo de base de datos hasta que exista su URL. */
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: true });
    }

    const { db } = await import("@/db");
    await db
      .insert(clubMembers)
      .values({ email, name, interests })
      .onConflictDoNothing({ target: clubMembers.email });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[club] signup failed", error);
    return NextResponse.json(
      { error: "No pudimos registrarte en este momento." },
      { status: 500 },
    );
  }
}
