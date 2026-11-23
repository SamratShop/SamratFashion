export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse w-full max-w-container-max mx-auto py-2">
      {/* Top Navigation / Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/20 overflow-hidden">
        <div className="h-full bg-primary w-2/5 animate-shimmer" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/20">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-surface-container-high rounded-md" />
          <div className="h-4 w-72 bg-surface-container rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-surface-container-high rounded-lg" />
          <div className="h-9 w-32 bg-surface-container-high rounded-lg" />
        </div>
      </div>

      {/* Metrics / Quick Action Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-surface-container rounded" />
              <div className="h-5 w-5 bg-surface-container rounded-full" />
            </div>
            <div className="h-7 w-24 bg-surface-container-high rounded" />
            <div className="h-3 w-32 bg-surface-container/60 rounded" />
          </div>
        ))}
      </div>

      {/* Main Workspace Canvas Skeleton */}
      <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
          <div className="h-5 w-40 bg-surface-container-high rounded" />
          <div className="h-8 w-24 bg-surface-container rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0"
            >
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/4 bg-surface-container-high rounded" />
                  <div className="h-3 w-1/2 bg-surface-container rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-surface-container rounded hidden sm:block" />
              <div className="h-5 w-16 bg-surface-container-high rounded-full" />
              <div className="h-4 w-24 bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
