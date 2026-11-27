import { OrderDetailsClient } from "@/components/account/OrderDetailsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Details",
};

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-3 sm:pt-6 md:pt-8 pb-28 lg:pb-12 outline-none"
    >
      <OrderDetailsClient orderId={id} />
    </main>
  );
}
