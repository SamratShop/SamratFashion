"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { GA_MEASUREMENT_ID, trackPageView } from "@/lib/analytics";

function AnalyticsNavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    // Do not track admin routes to avoid polluting store metrics & staff tracking
    if (pathname.startsWith("/admin")) {
      if (typeof window !== "undefined" && GA_MEASUREMENT_ID) {
        (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
      }
      return;
    }

    // Re-enable tracking if navigating from admin back to storefront
    if (typeof window !== "undefined" && GA_MEASUREMENT_ID) {
      (window as any)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    }

    // Never leak public tracking bearer tokens to Google Analytics
    const sanitizedPath = pathname.startsWith("/track/") ? "/track/[token]" : pathname;
    const url = searchParams?.toString() ? `${sanitizedPath}?${searchParams.toString()}` : sanitizedPath;
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (!GA_MEASUREMENT_ID || isAdminRoute) {
    return (
      <Suspense fallback={null}>
        <AnalyticsNavigationTracker />
      </Suspense>
    );
  }

  return (
    <>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: false
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <AnalyticsNavigationTracker />
      </Suspense>
    </>
  );
}
