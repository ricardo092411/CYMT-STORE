"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { Drop } from "@/types/drop";

type DropsContextValue = {
  drops: Drop[];
  refreshDrops: () => Promise<Drop[]>;
};

const DropsContext = createContext<DropsContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isDrop(value: unknown): value is Drop {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    isNullableString(value.title) &&
    isNullableString(value.description) &&
    isNullableString(value.banner) &&
    isNullableString(value.image) &&
    isNullableString(value.theme) &&
    typeof value.live === "boolean" &&
    isNullableString(value.releaseDate)
  );
}

async function fetchDrops(endpoint: "/api/drops" | "/api/admin/drops"): Promise<Drop[]> {
  const response = await fetch(endpoint, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("No fue posible cargar los Drops");
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isDrop)) {
    throw new Error("La API de Drops devolvió una respuesta inválida");
  }

  return data;
}

export function DropsProvider({
  initialDrops,
  children,
}: {
  initialDrops: Drop[];
  children: ReactNode;
}) {
  const [drops, setDrops] = useState(initialDrops);
  const pathname = usePathname();
  const endpoint = pathname.startsWith("/admin") ? "/api/admin/drops" : "/api/drops";

  const refreshDrops = useCallback(async (): Promise<Drop[]> => {
    const confirmedDrops = await fetchDrops(endpoint);
    setDrops(confirmedDrops);
    return confirmedDrops;
  }, [endpoint]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const confirmedDrops = await fetchDrops(endpoint);
        if (!cancelled) setDrops(confirmedDrops);
      } catch {
        // The server-rendered database result remains available if a refresh fails.
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return <DropsContext.Provider value={{ drops, refreshDrops }}>{children}</DropsContext.Provider>;
}

export function useDrops(): Drop[] {
  const context = useContext(DropsContext);
  if (context === null) {
    throw new Error("useDrops must be used within DropsProvider");
  }

  return context.drops;
}

export function useDropsRefresh(): () => Promise<Drop[]> {
  const context = useContext(DropsContext);
  if (context === null) {
    throw new Error("useDropsRefresh must be used within DropsProvider");
  }

  return context.refreshDrops;
}
