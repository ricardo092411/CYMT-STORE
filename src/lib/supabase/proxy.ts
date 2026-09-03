import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getClaims();

  const email =
    typeof data?.claims?.email === "string"
      ? data.claims.email.trim().toLowerCase()
      : "";

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";

  const isAdmin =
    !error &&
    Boolean(data?.claims) &&
    Boolean(adminEmail) &&
    email === adminEmail;

  const pathname = request.nextUrl.pathname;

  const isAdminPage =
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    pathname !== "/admin/login";

  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isAdminSessionApi = pathname === "/api/admin/session";

  // Protege el panel visual.
  if (isAdminPage && !isAdmin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";

    return NextResponse.redirect(loginUrl);
  }

  // Primera barrera para las APIs administrativas.
  if (isAdminApi && !isAdmin && !isAdminSessionApi) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  return response;
}
