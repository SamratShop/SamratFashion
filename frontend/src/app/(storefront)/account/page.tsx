import AccountHubClient from "@/components/account/AccountHubClient";
import { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getAccountFaqs } from "@/lib/seo";

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

export default function AccountPage() {
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
      <AccountHubClient />
    </main>
  );
}
