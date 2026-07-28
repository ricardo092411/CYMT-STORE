import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/providers/store-provider";
import { EditorProvider } from "@/providers/editor-provider";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingSocial } from "@/components/layout/floating-social";
import { GlobalChrome } from "@/components/layout/global-chrome";
import { site } from "@/data/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const ogImage = "/images/hero/hero-main.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  creator: site.legalName,
  publisher: site.legalName,
  keywords: [
    "CYMT Store",
    "streetwear El Salvador",
    "ropa under El Salvador",
    "camisetas anime",
    "hoodies",
    "drops exclusivos",
    "Entregas En 48 Horas",
    "moda El Salvador",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_SV",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${site.name} — streetwear premium`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [ogImage],
  },
  category: "shopping",
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${grotesk.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-ink antialiased">
        <StoreProvider>
          <EditorProvider>
            <AnnouncementBar />
            <Header />
            <main>{children}</main>
            <Footer />
            <FloatingSocial />
            <GlobalChrome />
          </EditorProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
