import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Download, ReceiptText, FileText, PackageCheck, Mail, Phone, MapPin } from 'lucide-react';
import { getProfile } from '@/lib/db';
import { getOrder } from '@/lib/orders';
import { money } from '@/lib/shop-types';
import { requestDate } from '@/lib/contact-requests';
import { orderLabels, documentKinds, documentTitles } from '@/lib/order-utils';
import { OrderForm } from '@/components/order-editor';
import { OrderDocument } from '@/components/order-document';
import { PrintDocument } from '@/components/order-document-controls';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: 'Order not found' };
  const order = await getOrder(id);
  return { title: order ? `Order DK-${order.number}` : 'Order not found' };
}
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [o, seller] = await Promise.all([getOrder(id), getProfile()]);
  if (!o) notFound();
  const icons = { receipt: ReceiptText, invoice: FileText, shipping: PackageCheck };
  return (
    <>
      <div className="order-breadcrumb shop-order-controls">
        <Link href="/admin/orders">Orders</Link>
        <span>/</span>
        <span>DK-{o.number}</span>
      </div>
      <header className="orders-heading shop-order-controls">
        <div>
          <p className="shop-kicker">ORDER DETAILS</p>
          <h1>DK-{o.number}</h1>
          <p>Placed {requestDate(o.created_at)}</p>
          <div className="order-badges">
            <span className={`order-badge order-${o.status}`}>{orderLabels[o.status]}</span>
            <span className={`order-badge order-${o.payment_status}`}>
              {orderLabels[o.payment_status]}
            </span>
          </div>
        </div>
        <PrintDocument label="Print receipt / Save PDF" />
      </header>
      <div className="order-overview shop-order-controls">
        <section>
          <span>Order total</span>
          <strong>{money(o.subtotal + o.shipping, o.currency)}</strong>
          <small>
            {o.items.reduce((sum, i) => sum + i.quantity, 0)} units · {o.items.length} product lines
          </small>
        </section>
        <section>
          <span>Customer</span>
          <strong>{o.name}</strong>
          <a href={`mailto:${o.email}`}>
            <Mail size={15} />
            {o.email}
          </a>
          <a href={`tel:${o.phone.replace(/[^+\d]/g, '')}`}>
            <Phone size={15} />
            {o.phone}
          </a>
        </section>
        <section>
          <span>
            <MapPin size={16} />
            Deliver to
          </span>
          <strong>{o.city}</strong>
          <p>
            {o.address}
            <br />
            {o.postal_code} · {o.country}
          </p>
        </section>
      </div>
      <section className="order-documents shop-order-controls" aria-label="Order documents">
        {documentKinds.map((kind) => {
          const Icon = icons[kind];
          return (
            <div key={kind}>
              <Icon size={25} />
              <h2>{documentTitles[kind]}</h2>
              <p>
                {kind === 'receipt'
                  ? 'Order and payment acknowledgement.'
                  : kind === 'invoice'
                    ? 'Item prices, delivery and amount due.'
                    : 'Delivery details and packing list.'}
              </p>
              <div>
                <Link href={`/admin/orders/${o.id}/documents/${kind}`}>View & print</Link>
                <a href={`/admin/orders/${o.id}/documents/${kind}/download`} download>
                  <Download size={15} />
                  PDF
                </a>
              </div>
            </div>
          );
        })}
      </section>
      <div className="order-detail-grid">
        <section aria-label="Receipt preview">
          <div className="orders-preview-heading shop-order-controls">
            <h2>Receipt preview</h2>
            <span>Purchase-time prices, kept with the order</span>
          </div>
          <OrderDocument order={o} kind="receipt" seller={seller} />
        </section>
        <aside className="shop-order-controls">
          <OrderForm order={o} />
        </aside>
      </div>
    </>
  );
}
