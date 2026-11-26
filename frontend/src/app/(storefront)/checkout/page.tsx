import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  robots: {
    index: false,
    follow: false,
  },
  alternates: { canonical: "/checkout" },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
