"use client";

import type { LucideIcon } from "lucide-react";
import {
  Factory,
  FolderDown,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Paintbrush,
  Scissors,
  Settings2,
  Shirt,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAdmin } from "@/app/admin/actions";
import { ADMIN_MODULES, type AdminModuleId, getAdminModule } from "@/lib/admin-modules";
import { cn } from "@/lib/utils";

const moduleIcons: Record<AdminModuleId, LucideIcon> = {
  camisas: Shirt,
  maquinas: Factory,
  tintas: Paintbrush,
  confeccion: Scissors,
  descargas: FolderDown,
};

function AdminBrand() {
  return (
    <Link href="/admin" className="flex items-center gap-3" aria-label="CYMT Admin">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(229,9,20,0.95)]">C</span>
      <span>
        <span className="block font-display text-sm font-bold tracking-[0.14em] text-white">CYMT ADMIN</span>
        <span className="mt-0.5 block text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-zinc-500">Content & Catalog</span>
      </span>
    </Link>
  );
}

function ModuleNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Módulos de administración" className={cn(mobile ? "flex gap-1 overflow-x-auto pb-1" : "space-y-1")}>
      <Link
        href="/admin"
        className={cn(
          "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          pathname === "/admin" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-400 hover:bg-white/5 hover:text-white",
        )}
      >
        <LayoutDashboard className="h-4 w-4" /> Dashboard
      </Link>
      {ADMIN_MODULES.map((module) => {
        const Icon = moduleIcons[module.id];
        const active = pathname === module.href;
        return (
          <Link
            key={module.id}
            href={module.href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              active ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" /> {module.navigationLabel}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/admin/login";
  const currentModule = getAdminModule(pathname.split("/")[2] ?? "");
  const pageTitle = pathname === "/admin" ? "Dashboard" : currentModule?.title ?? "Administración";

  if (isLoginRoute) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-[#101114] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#0a0b0d] px-4 py-5 lg:flex lg:flex-col">
        <AdminBrand />
        <div className="mt-10"><ModuleNavigation /></div>
        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="px-3 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-zinc-600">Preparado</p>
          <div className="mt-2 space-y-1">
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600"><ImageIcon className="h-4 w-4" /> Media</span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600"><Settings2 className="h-4 w-4" /> Configuración</span>
          </div>
        </div>
        <form action={logoutAdmin} className="mt-auto border-t border-white/10 pt-5">
          <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </form>
      </aside>

      <div className="border-b border-white/10 bg-[#0a0b0d] lg:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-4"><AdminBrand /><form action={logoutAdmin}><button type="submit" aria-label="Cerrar sesión" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" /></button></form></div>
        <div className="px-3"><ModuleNavigation mobile /></div>
      </div>

      <div className="min-h-dvh lg:pl-72">
        <header className="flex min-h-20 items-center justify-between border-b border-white/10 bg-[#101114]/95 px-5 backdrop-blur md:px-8 lg:px-10">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-zinc-500">CYMT Admin</p>
            <h1 className="mt-1 font-display text-lg font-semibold text-white">{pageTitle}</h1>
          </div>
          <span className="hidden rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-red-300 sm:inline-flex">Panel protegido</span>
        </header>
        <main className="mx-auto w-full max-w-[96rem] px-5 py-8 md:px-8 md:py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
