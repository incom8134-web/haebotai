import { TicketQueue } from "@/components/admin/admin-view";
import { listAllTickets } from "@/lib/admin";

export const metadata = { title: "고객 문의 — 해봇 AI" };

const STATUSES = ["open", "answered", "closed"] as const;

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: rawStatus } = await searchParams;
  const status = STATUSES.includes(rawStatus as (typeof STATUSES)[number]) ? (rawStatus as (typeof STATUSES)[number]) : "open";
  const tickets = await listAllTickets(status);
  return <TicketQueue tickets={tickets} status={status} />;
}
