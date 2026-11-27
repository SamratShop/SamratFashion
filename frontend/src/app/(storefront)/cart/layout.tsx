import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Bag | Samrat Fashion",
  alternates: {
    canonical: "/cart",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
