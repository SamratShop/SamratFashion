import { Suspense } from "react";
import CustomerReviewsClient from "@/components/account/CustomerReviewsClient";
import { CustomerReviewsSkeleton } from "@/components/account/CustomerReviewsSkeleton";
import { serverFetchAuth } from "@/lib/serverApi";
import { SignInRequiredState } from "@/components/auth/SignInRequiredState";
import type { ReviewedItem, UnreviewedItem } from "@/components/account/CustomerReviewsClient";
import type { User } from "@/store/useAuthStore";

export const dynamic = "force-dynamic";

interface AuthMeResponse {
  success?: boolean;
  data?: {
    user?: User;
  };
}

interface ReviewsResponse {
  success?: boolean;
  data?: {
    reviews?: ReviewedItem[];
    unreviewedItems?: UnreviewedItem[];
  };
}

async function ReviewsContent() {
  const res = await serverFetchAuth<ReviewsResponse>("/reviews/my-reviews");
  const reviews = Array.isArray(res?.data?.reviews) ? res.data.reviews : [];
  const unreviewedItems = Array.isArray(res?.data?.unreviewedItems) ? res.data.unreviewedItems : [];

  return (
    <CustomerReviewsClient
      initialReviews={reviews}
      initialUnreviewedItems={unreviewedItems}
    />
  );
}

export default async function CustomerReviewsPage() {
  const authRes = await serverFetchAuth<AuthMeResponse>("/auth/me");
  const user = authRes?.data?.user;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-4 sm:pt-6 md:pt-6 pb-12 sm:pb-16 lg:pb-10 outline-none"
    >
      {!user ? (
        <SignInRequiredState context="reviews" redirectPath="/account/reviews" />
      ) : (
        <Suspense fallback={<CustomerReviewsSkeleton />}>
          <ReviewsContent />
        </Suspense>
      )}
    </main>
  );
}
