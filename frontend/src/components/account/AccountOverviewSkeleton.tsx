import { AccountNav } from "@/components/account/AccountNav";

/**
 * v4 layout-matching skeleton for the Account Overview hub.
 * Reused as Suspense streaming fallback.
 */
export function AccountOverviewSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col space-y-6 sm:space-y-8 pb-8 sm:pb-12 lg:pb-8 animate-pulse">
      <AccountNav currentTab="overview" />
      {/* Header Profile Summary Card Skeleton */}
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-h-[140px]">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="w-16 h-16 rounded-full bg-surface-container shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-7 w-48 max-w-full bg-surface-container rounded" />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              <div className="h-4 w-36 bg-surface-container rounded" />
              <div className="h-4 w-28 bg-surface-container rounded" />
              <div className="h-4 w-20 bg-surface-container rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="h-10 bg-surface-container rounded-xl flex-1 md:w-28 md:flex-initial" />
          <div className="h-10 bg-surface-container rounded-xl flex-1 md:w-28 md:flex-initial" />
        </div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant/20 shadow-sm min-h-[96px] h-[96px] flex flex-col justify-between">
            <div className="h-3 w-16 bg-surface-container rounded mb-1" />
            <div className="h-8 w-12 bg-surface-container rounded" />
          </div>
        ))}
      </div>

      {/* Service Cards Skeleton */}
      <div>
        <div className="h-6 w-40 bg-surface-container rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 shadow-sm flex items-start gap-4 min-h-[136px]">
              <div className="w-12 h-12 rounded-xl bg-surface-container shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-28 bg-surface-container rounded" />
                <div className="h-3 w-full bg-surface-container rounded" />
                <div className="h-3 w-3/4 bg-surface-container rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
