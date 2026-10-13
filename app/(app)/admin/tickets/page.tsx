import { TicketQueue } from "@/components/admin/admin-view";
import { listAllTickets, type TicketStatus } from "@/lib/admin";

export const metadata = { title: "고객 문의 — AI 해바", robots: { index: false } };

const STATUSES: TicketStatus[] = ["open", "answered", "closed"];

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = STATUSES.includes(raw as TicketStatus) ? (raw as TicketStatus) : "open";
  const { tickets, counts } = await listAllTickets(status);
  return <TicketQueue tickets={tickets} status={status} counts={counts} />;
}
