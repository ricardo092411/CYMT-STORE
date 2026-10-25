"use client";

import { usePathname } from "next/navigation";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { FloatingSocial } from "@/components/layout/floating-social";
import { GlobalChrome } from "@/components/layout/global-chrome";
import { Header } from "@/components/layout/header";

/** Keeps the storefront chrome out of the protected administrative surface. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    // GlobalChrome remains mounted so the existing editor context keeps its behavior on /admin/camisas.
    return <><>{children}</><GlobalChrome /></>;
  }

  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>{children}</main>
      <Footer />
      <FloatingSocial />
      <GlobalChrome />
    </>
  );
}
