import { redirect } from 'next/navigation';
export default async function LegacyOrder({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/admin/orders/${encodeURIComponent((await params).id)}`);
}
