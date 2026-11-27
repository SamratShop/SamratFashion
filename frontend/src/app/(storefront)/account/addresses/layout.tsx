import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Addresses | Samrat Fashion",
  alternates: {
    canonical: "/account/addresses",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AddressesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
