import { AccountNav } from "@/components/account/AccountNav";

export function CustomerReviewsSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col pb-8 sm:pb-12 lg:pb-8 animate-pulse">
      <AccountNav currentTab="reviews" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8 pb-6 border-b border-outline-variant/40">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap min-h-[36px]">
            <h1 className="font-headline-lg text-2xl sm:text-3xl lg:text-4xl font-black text-on-surface uppercase tracking-tight">
              MY REVIEWS
            </h1>
            <div className="h-5 w-20 bg-surface-container rounded-md" />
          </div>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-xl leading-relaxed">
            Share your thoughts on delivered pieces and help other customers find their perfect fit.
          </p>
        </div>
      </div>
      <div className="flex gap-4 sm:gap-8 mb-8 border-b border-outline-variant/30">
        <div className="pb-3 h-8 w-24 bg-surface-container rounded" />
        <div className="pb-3 h-8 w-24 bg-surface-container rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[220px]">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 min-h-[180px] flex items-center gap-4"
          >
            <div className="w-24 h-24 rounded-xl bg-surface-container shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="h-5 w-3/4 bg-surface-container rounded" />
              <div className="h-4 w-1/2 bg-surface-container-low rounded" />
              <div className="h-4 w-1/3 bg-surface-container-low rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
