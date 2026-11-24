"use client";

/**
 * Legacy loader - Material Symbols stylesheet is now loaded synchronously
 * in <head> in layout.tsx to prevent font flash (FOIT/FOUT).
 */
export function AsyncStyleLoader() {
  return null;
}
