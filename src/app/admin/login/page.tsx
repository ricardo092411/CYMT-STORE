import { redirect } from "next/navigation";
import { KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { loginAdmin } from "./actions";
import { Button, Container } from "@/components/ui";
import { isAdmin } from "@/lib/auth/admin";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: LoginPageProps) {
  // Si ya inició sesión como administrador,
  // no tiene sentido mostrarle nuevamente el login.
  if (await isAdmin()) {
    redirect("/admin");
  }

  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <Container className="flex min-h-[75vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/30 bg-brand-soft">
            <ShieldCheck className="h-8 w-8 text-brand" />
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-2xl md:p-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
              <LockKeyhole className="h-3.5 w-3.5" />
              Área protegida
            </span>

            <h1 className="mt-4 font-display text-3xl font-bold">
              CYMT Admin
            </h1>

            <p className="mt-2 text-sm text-ink-muted">
              Inicia sesión para administrar la tienda.
            </p>
          </div>

          {hasError && (
            <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">
              Correo o contraseña incorrectos.
            </div>
          )}

          <form action={loginAdmin} className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Correo
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@cymt.com"
                  className="h-12 w-full rounded-2xl border border-line bg-bg-soft pl-11 pr-4 text-sm text-ink outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Contraseña
              </label>

              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="h-12 w-full rounded-2xl border border-line bg-bg-soft pl-11 pr-4 text-sm text-ink outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              <LockKeyhole className="h-4 w-4" />
              Entrar al panel
            </Button>
          </form>

          <div className="mt-6 border-t border-line pt-5 text-center">
            <p className="text-xs text-ink-faint">
              Acceso exclusivo para administración de CYMT STORE.
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}