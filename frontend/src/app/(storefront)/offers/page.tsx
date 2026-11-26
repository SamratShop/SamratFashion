import type { Metadata } from "next";
import { api } from "@/lib/api";
import { getActiveCategories, filterStorefrontCategories } from "@/lib/catalog";
import { serverFetch } from "@/lib/serverApi";
import OffersClient from "@/components/offers/OffersClient";
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getOffersFaqs } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Special Menswear Offers, Discounts & Coupons | Samrat Fashion",
  description:
    "Discover exclusive discount coupons, seasonal offers, and free express shipping on tailored Indian menswear and Nehru jackets at Samrat Fashion.",
  alternates: {
    canonical: "/offers",
  },
  openGraph: {
    title: "Special Menswear Offers & Discounts | Samrat Fashion",
    description:
      "Discover exclusive discount coupons, seasonal offers, and free express shipping on tailored Indian menswear and Nehru jackets at Samrat Fashion.",
    url: "/offers",
    type: "website",
  },
};

async function getActiveCampaigns() {
  const cached = await serverFetch<{ success: boolean; data: unknown[] }>("/catalog/campaigns/active", {
    revalidate: 60,
  });
  if (cached?.success && Array.isArray(cached.data)) {
    return cached.data;
  }
  try {
    const res = await api.get("/catalog/campaigns/active");
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch (error) {
    console.error("Failed to load active campaigns for offers page:", error);
    return [];
  }
}

async function getBanners() {
  const cached = await serverFetch<{ success: boolean; data: unknown[] }>("/catalog/banners", {
    params: { position: "ALL" },
    revalidate: 60,
  });
  if (cached?.success && Array.isArray(cached.data)) {
    return cached.data;
  }
  try {
    const res = await api.get("/catalog/banners?position=ALL");
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  } catch (error) {
    console.error("Failed to load banners for offers page:", error);
    return [];
  }
}

export default async function OffersPage() {
  const [campaigns, banners, rawCategories] = await Promise.all([
    getActiveCampaigns(),
    getBanners(),
    getActiveCategories(),
  ]);
  const categories = filterStorefrontCategories(rawCategories || []);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="w-full flex-grow outline-none"
    >
      <JsonLd
        id="offers-breadcrumbs-jsonld"
        data={getBreadcrumbJsonLd([
          { name: "Home", url: "/" },
          { name: "Offers", url: "/offers" },
        ])}
      />
      <JsonLd
        id="offers-faq-jsonld"
        data={getFaqPageJsonLd(
          getOffersFaqs(),
          "Frequently asked questions regarding discount vouchers, free shipping rules, and payment options at Samrat Fashion."
        )}
      />
      <OffersClient
        campaigns={campaigns}
        banners={banners}
        categories={categories}
      />
    </main>
  );
}
