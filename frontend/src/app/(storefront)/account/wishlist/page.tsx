import { Suspense } from "react";
import { WishlistClient } from "@/components/account/WishlistClient";
import { WishlistSkeleton } from "@/components/account/WishlistSkeleton";
import { serverFetchAuth } from "@/lib/serverApi";
import { SignInRequiredState } from "@/components/auth/SignInRequiredState";
import type { WishlistItem } from "@/store/useWishlistStore";
import type { User } from "@/store/useAuthStore";

export const dynamic = "force-dynamic";

interface AuthMeResponse {
  success?: boolean;
  data?: {
    user?: User;
  };
}

interface WishlistResponse {
  status?: string;
  success?: boolean;
  data?: {
    items?: WishlistItem[];
  };
}

async function WishlistContent() {
  const res = await serverFetchAuth<WishlistResponse>("/wishlist");
  const rawItems = res?.data?.items;
  const items: WishlistItem[] = Array.isArray(rawItems) ? rawItems : [];

  return <WishlistClient initialItems={items} />;
}

export default async function WishlistPage() {
  const authRes = await serverFetchAuth<AuthMeResponse>("/auth/me");
  const user = authRes?.data?.user;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-4 sm:pt-6 md:pt-6 pb-12 sm:pb-16 lg:pb-10 outline-none"
    >
      {!user ? (
        <SignInRequiredState context="wishlist" redirectPath="/account/wishlist" />
      ) : (
        <Suspense fallback={<WishlistSkeleton />}>
          <WishlistContent />
        </Suspense>
      )}
    </main>
  );
}
