import CustomerTicketDetailClient from "@/components/support/CustomerTicketDetailClient";

export const metadata = {
  title: "Support Ticket Detail",
  description: "View ticket status and support conversation history.",
};

export const dynamic = "force-dynamic";

export default async function CustomerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <main id="main-content" tabIndex={-1} className="w-full flex-grow outline-none">
      <CustomerTicketDetailClient ticketId={resolvedParams.id} />
    </main>
  );
}
