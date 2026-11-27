import { AccountNav } from "@/components/account/AccountNav";

export function WishlistSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col pb-8 sm:pb-12 lg:pb-8 animate-pulse">
      <AccountNav currentTab="wishlist" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8 pb-6 border-b border-outline-variant/40">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <div className="h-9 w-48 bg-surface-container rounded" />
            <div className="h-5 w-14 bg-surface-container rounded" />
          </div>
          <div className="h-4 w-72 bg-surface-container rounded mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 min-h-[380px]">
        {[1, 2].map((skeletonIdx) => (
          <div
            key={skeletonIdx}
            className="bg-surface-container-lowest rounded-lg overflow-hidden border border-outline-variant/40"
          >
            <div className="aspect-[3/4] bg-surface-container" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-surface-container rounded" />
              <div className="h-4 w-1/3 bg-surface-container rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
