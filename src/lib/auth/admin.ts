import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminClaims() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email.trim().toLowerCase()
      : "";

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || email !== adminEmail) {
    return null;
  }

  return data.claims;
}

export async function isAdmin() {
  const claims = await getAdminClaims();
  return Boolean(claims);
}