import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved Wishlist | Samrat Fashion",
  alternates: {
    canonical: "/account/wishlist",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
