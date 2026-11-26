import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Notifications | Samrat Fashion",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
