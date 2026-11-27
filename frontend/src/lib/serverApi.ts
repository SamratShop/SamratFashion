export function getServerApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://samratfashion-tbec.onrender.com/api"
      : "http://localhost:5000/api");
  const normalized = configured.replace(/\/+$/, "");
  const base = /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
  return typeof window === "undefined" && !base.includes("onrender.com")
    ? base.replace("localhost", "127.0.0.1")
    : base;
}

export interface ServerFetchOptions {
  params?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  revalidate?: number;
  tags?: string[];
}

/**
 * Server-side cached fetch utility for Next.js App Router.
 * Uses Next.js native Data Cache to eliminate cross-cloud document request latency (TTFB).
 */
export async function serverFetch<T>(
  path: string,
  options?: ServerFetchOptions
): Promise<T | null> {
  const baseUrl = getServerApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${cleanPath}`);

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.append(key, String(value));
      }
    });
  }

  try {
    const res = await fetch(url.toString(), {
      next: {
        revalidate: options?.revalidate ?? 60,
        tags: options?.tags,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data as T;
  } catch (error) {
    console.error(`serverFetch error for ${url.toString()}:`, error);
    return null;
  }
}

export interface ServerFetchAuthOptions {
  params?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  cookie?: string;
}

/**
 * Authenticated server-side fetch utility for Next.js App Router.
 * - Forwards incoming request Cookie header verbatim (via next/headers or explicit option).
 * - Enforces cache: 'no-store' (never cached, never served to other users).
 * - Returns null on non-2xx responses (401/403/errors) or when unauthenticated.
 */
export async function serverFetchAuth<T>(
  path: string,
  options?: ServerFetchAuthOptions
): Promise<T | null> {
  const baseUrl = getServerApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${cleanPath}`);

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.append(key, String(value));
      }
    });
  }

  let cookieHeader = options?.cookie;
  if (cookieHeader === undefined) {
    try {
      const nextHeaders = await import("next/headers");
      const headerList = await nextHeaders.headers();
      cookieHeader = headerList.get("cookie") ?? "";
    } catch {
      cookieHeader = "";
    }
  }

  // If no cookies are present on an authenticated call, return null immediately without network waste
  if (!cookieHeader) {
    return null;
  }

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data as T;
  } catch (error) {
    console.error(`serverFetchAuth error for ${url.toString()}:`, error);
    return null;
  }
}

