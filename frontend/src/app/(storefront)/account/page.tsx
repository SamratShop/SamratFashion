import { Suspense } from "react";
import AccountHubClient from "@/components/account/AccountHubClient";
import { AccountOverviewSkeleton } from "@/components/account/AccountOverviewSkeleton";
import { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getAccountFaqs } from "@/lib/seo";
import { serverFetchAuth } from "@/lib/serverApi";
import { SignInRequiredState } from "@/components/auth/SignInRequiredState";
import type { User } from "@/store/useAuthStore";

export const metadata: Metadata = {
  title: "Customer Account Hub, Orders & Returns | Samrat Fashion",
  description:
    "Manage your Samrat Fashion customer account, track Nehru jacket and menswear orders, request size returns, update delivery addresses, and view invoices.",
  alternates: {
    canonical: "/account",
  },
  openGraph: {
    title: "Customer Account Hub, Orders & Returns | Samrat Fashion",
    description:
      "Manage your Samrat Fashion customer account, track Nehru jacket and menswear orders, request size returns, update delivery addresses, and view invoices.",
    url: "/account",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

interface AuthMeResponse {
  success?: boolean;
  data?: {
    user?: User;
  };
}

interface OrdersResponse {
  status?: string;
  success?: boolean;
  data?: any[];
}

interface ReviewsResponse {
  status?: string;
  success?: boolean;
  data?: {
    reviews?: any[];
  } | any[];
}

async function AccountOverviewContent({ user }: { user: User }) {
  const [ordersRes, reviewsRes] = await Promise.all([
    serverFetchAuth<OrdersResponse>("/orders"),
    serverFetchAuth<ReviewsResponse>("/reviews/my-reviews"),
  ]);

  const ords = ordersRes?.data;
  const ordersCount = Array.isArray(ords) ? ords.length : 0;

  const rvs = reviewsRes?.data;
  const reviewsCount = Array.isArray(rvs)
    ? rvs.length
    : Array.isArray(rvs?.reviews)
    ? rvs.reviews.length
    : 0;

  return (
    <AccountHubClient
      initialUser={user}
      initialOrdersCount={ordersCount}
      initialReviewsCount={reviewsCount}
    />
  );
}

export default async function AccountPage() {
  const authRes = await serverFetchAuth<AuthMeResponse>("/auth/me");
  const user = authRes?.data?.user;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-4 sm:pt-6 md:pt-6 pb-12 sm:pb-16 lg:pb-10 outline-none"
    >
      <JsonLd
        id="account-breadcrumb-jsonld"
        data={getBreadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "My Account", url: "/account" },
        ])}
      />
      <JsonLd
        id="account-faq-jsonld"
        data={getFaqPageJsonLd(
          getAccountFaqs(),
          "Frequently asked questions regarding customer account management, order tracking, address books, and size returns at Samrat Fashion."
        )}
      />
      {!user ? (
        <SignInRequiredState context="account" redirectPath="/account" />
      ) : (
        <Suspense fallback={<AccountOverviewSkeleton />}>
          <AccountOverviewContent user={user} />
        </Suspense>
      )}
    </main>
  );
}
