import { Suspense } from "react";
import { OrdersClient } from "@/components/account/OrdersClient";
import { OrdersSkeleton } from "@/components/account/OrdersSkeleton";
import { serverFetchAuth } from "@/lib/serverApi";
import { SignInRequiredState } from "@/components/auth/SignInRequiredState";
import type { Order } from "@/store/useOrderStore";
import type { User } from "@/store/useAuthStore";

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
  data?: Order[];
}

async function OrdersContent() {
  const ordersRes = await serverFetchAuth<OrdersResponse>("/orders");
  const rawOrders = ordersRes?.data;
  const orders: Order[] = Array.isArray(rawOrders) ? rawOrders : [];

  return <OrdersClient initialOrders={orders} />;
}

export default async function OrdersPage() {
  const authRes = await serverFetchAuth<AuthMeResponse>("/auth/me");
  const user = authRes?.data?.user;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-4 sm:pt-6 md:pt-6 pb-12 sm:pb-16 lg:pb-10 outline-none"
    >
      {!user ? (
        <SignInRequiredState context="orders" redirectPath="/account/orders" />
      ) : (
        <Suspense fallback={<OrdersSkeleton />}>
          <OrdersContent />
        </Suspense>
      )}
    </main>
  );
}
