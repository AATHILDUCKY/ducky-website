import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getOrder } from '@/lib/orders';
import { getDocumentSeller } from '@/lib/order-document-seller';
import { documentKinds, documentTitles } from '@/lib/order-utils';
import { OrderDocument } from '@/components/order-document';
import { PrintDocument } from '@/components/order-document-controls';
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; kind: string }>;
}) {
  const { id, kind } = await params;
  const parsed = z.enum(documentKinds).safeParse(kind);
  if (!z.uuid().safeParse(id).success || !parsed.success) notFound();
  const [o, seller] = await Promise.all([getOrder(id), getDocumentSeller()]);
  if (!o) notFound();
  return (
    <>
      <div className="document-toolbar shop-order-controls">
        <Link href={`/admin/orders/${id}`}>Back to DK-{o.number}</Link>
        <div>
          <a
            href={`/admin/orders/${id}/documents/${kind}/download`}
            className="shop-button shop-secondary"
            download
          >
            Download PDF
          </a>
          <PrintDocument label={`Print ${documentTitles[parsed.data].toLowerCase()}`} />
        </div>
      </div>
      <nav className="orders-tabs document-tabs shop-order-controls" aria-label="Document type">
        {documentKinds.map((k) => (
          <Link
            key={k}
            href={`/admin/orders/${id}/documents/${k}`}
            aria-current={kind === k ? 'page' : undefined}
          >
            {documentTitles[k]}
          </Link>
        ))}
      </nav>
      <div className="order-document-page">
        <OrderDocument order={o} kind={parsed.data} seller={seller} />
      </div>
    </>
  );
}
