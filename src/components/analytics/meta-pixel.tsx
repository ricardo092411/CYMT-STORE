"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { META_PIXEL_ID, trackMetaPixelPageView } from "@/lib/meta-pixel";

export function MetaPixel() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const lastTrackedPathRef = useRef<string | null>(null);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (isAdminRoute) {
      lastTrackedPathRef.current = null;
      return;
    }
    if (!ready || lastTrackedPathRef.current === pathname) return;

    trackMetaPixelPageView();
    lastTrackedPathRef.current = pathname;
  }, [isAdminRoute, pathname, ready]);

  if (!META_PIXEL_ID || isAdminRoute) return null;

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive" onReady={() => setReady(true)}>
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init",${JSON.stringify(META_PIXEL_ID)});`}
    </Script>
  );
}
