import { Suspense } from "react";
import { AddressBookClient } from "@/components/account/AddressBookClient";
import { AddressBookSkeleton } from "@/components/account/AddressBookSkeleton";
import { serverFetchAuth } from "@/lib/serverApi";
import { SignInRequiredState } from "@/components/auth/SignInRequiredState";
import type { Address } from "@/store/useAddressStore";
import type { User } from "@/store/useAuthStore";

export const dynamic = "force-dynamic";

interface AuthMeResponse {
  success?: boolean;
  data?: {
    user?: User;
  };
}

interface AddressesResponse {
  status?: string;
  success?: boolean;
  data?: Address[];
}

async function AddressesContent() {
  const res = await serverFetchAuth<AddressesResponse>("/addresses");
  const rawAddresses = res?.data;
  const addresses: Address[] = Array.isArray(rawAddresses) ? rawAddresses : [];

  return <AddressBookClient initialAddresses={addresses} />;
}

export default async function AddressesPage() {
  const authRes = await serverFetchAuth<AuthMeResponse>("/auth/me");
  const user = authRes?.data?.user;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-4 sm:pt-6 md:pt-6 pb-12 sm:pb-16 lg:pb-10 outline-none"
    >
      {!user ? (
        <SignInRequiredState context="addresses" redirectPath="/account/addresses" />
      ) : (
        <Suspense fallback={<AddressBookSkeleton />}>
          <AddressesContent />
        </Suspense>
      )}
    </main>
  );
}
