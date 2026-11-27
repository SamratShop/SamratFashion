import { AccountNav } from "@/components/account/AccountNav";

export function AddressBookSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col pb-8 sm:pb-12 lg:pb-8 animate-pulse">
      <AccountNav currentTab="addresses" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 pb-6 border-b border-outline-variant/40">
        <div>
          <div className="flex items-center gap-3 mb-1.5 min-h-[36px]">
            <h1 className="font-headline-lg text-2xl sm:text-3xl lg:text-4xl font-black text-on-surface uppercase tracking-tight">
              SAVED ADDRESSES
            </h1>
            <div className="h-5 w-20 bg-surface-container rounded-md" />
          </div>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-xl leading-relaxed">
            Manage your delivery destinations and set your default shipping address for faster checkout.
          </p>
        </div>
        <div className="h-[44px] w-full sm:w-44 bg-surface-container rounded-lg shrink-0" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-[260px]"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-5 w-16 bg-surface-container-high rounded-md" />
                <div className="h-4 w-14 bg-surface-container-high rounded" />
              </div>
              <div className="h-6 w-3/4 bg-surface-container-high rounded mt-2" />
              <div className="h-4 w-full bg-surface-container-low rounded" />
              <div className="h-4 w-2/3 bg-surface-container-low rounded" />
              <div className="h-4 w-1/2 bg-surface-container-low rounded" />
            </div>
            <div className="pt-4 border-t border-outline-variant/20 flex justify-between">
              <div className="h-7 w-20 bg-surface-container-high rounded" />
              <div className="h-7 w-24 bg-surface-container-low rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
