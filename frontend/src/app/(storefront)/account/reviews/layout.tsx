import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Reviews | Samrat Fashion",
  description: "View and write product reviews for your delivered orders.",
  alternates: {
    canonical: "/account/reviews",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
