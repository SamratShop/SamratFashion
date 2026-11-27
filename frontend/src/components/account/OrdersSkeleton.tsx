import { LayoutDashboard, Package, MapPin, Heart, Star } from "lucide-react";

const ACCOUNT_TABS = [
  { label: "Overview", href: "/account", icon: LayoutDashboard },
  { label: "Orders", href: "/account/orders", icon: Package, active: true },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Reviews", href: "/account/reviews", icon: Star },
];

/**
 * v4 layout-matching skeleton for the Orders page.
 * Reused as Suspense streaming fallback.
 */
export function OrdersSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col pb-8 sm:pb-12 lg:pb-8 animate-pulse">
      {/* Navigation Tabs Skeleton */}
      <div className="relative mb-6 sm:mb-8">
        <div className="overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-1.5 sm:gap-2 pb-1 border-b border-outline-variant/40">
          {ACCOUNT_TABS.map((tab) => (
            <div
              key={tab.href}
              className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider min-h-[40px] ${
                tab.active ? "bg-neutral-950 text-white" : "text-neutral-600"
              }`}
            >
              <span>{tab.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Header Section Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8 pb-6 border-b border-outline-variant/40">
        <div>
          <div className="h-9 w-48 bg-surface-container rounded mb-2" />
          <div className="h-4 w-72 bg-surface-container rounded" />
        </div>
      </div>

      {/* Empty State Shell Skeleton */}
      <div className="text-center py-10 px-6 sm:px-10 bg-surface-container-lowest border border-outline-variant/50 rounded-2xl max-w-lg mx-auto shadow-xs space-y-5">
        <div className="w-24 h-28 mx-auto rounded-xl bg-surface-container" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-surface-container rounded mx-auto" />
          <div className="h-4 w-64 bg-surface-container rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}
