"use client";

import { useEffect } from "react";
import { trackSearch } from "@/lib/analytics";

export function ShopSearchTracker({ query, totalResults }: { query: string; totalResults: number }) {
  useEffect(() => {
    if (!query || !query.trim()) return;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(
        () => trackSearch(query, totalResults),
        { timeout: 2000 }
      );
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(() => trackSearch(query, totalResults), 1000);
      return () => clearTimeout(timer);
    }
  }, [query, totalResults]);

  return null;
}
