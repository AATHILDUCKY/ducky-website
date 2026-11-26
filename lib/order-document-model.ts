import { money, type Order } from './shop-types';
import { documentTitles, orderLabels, paymentNote, type DocumentKind } from './order-utils';
export type DocumentSeller = {
  name: string;
  email: string;
  storeName?: string;
  location?: string;
  website?: string;
};
export const documentTheme = {
  ink: '#202522',
  muted: '#69716d',
  accent: '#c76143',
  soft: '#faf0e9',
  line: '#dfe4df',
  table: '#f4f6f3',
  green: '#316345',
  greenSoft: '#edf5ef',
};
export function documentModel(order: Order, kind: DocumentKind, seller: DocumentSeller) {
  const shipping = kind === 'shipping';
  const total = order.subtotal + order.shipping;
  const due = order.payment_status === 'unpaid' && order.status !== 'cancelled' ? total : 0;
  const storeName = seller.storeName?.trim() || seller.name;
  const initials = storeName
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const status =
    order.status === 'cancelled'
      ? 'Order cancelled'
      : order.payment_status === 'paid'
        ? 'Payment received'
        : order.payment_status === 'refunded'
          ? 'Refund recorded'
          : 'Payment pending';
  const date = new Date(order.created_at);
  const dateLabel = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  });
  const timeLabel = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Colombo',
  });
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    kind,
    shipping,
    title: documentTitles[kind],
    subtitle: shipping
      ? 'Packing & delivery document'
      : kind === 'invoice'
        ? 'Itemised order invoice'
        : 'Order & payment acknowledgement',
    reference: `${kind === 'invoice' ? 'INV' : shipping ? 'SHP' : 'REC'}-${order.number}`,
    orderReference: `DK-${order.number}`,
    storeName,
    initials,
    dateLabel,
    timeLabel,
    status,
    fulfilment: orderLabels[order.status] || order.status,
    payment: orderLabels[order.payment_status] || order.payment_status,
    method: order.payment_method === 'cod' ? 'Cash on delivery' : 'Arranged payment',
    total,
    due,
    units,
    summaryLabel: shipping ? 'ITEM UNITS' : kind === 'invoice' ? 'AMOUNT DUE' : 'ORDER TOTAL',
    summaryValue: shipping
      ? String(units)
      : money(kind === 'invoice' ? due : total, order.currency),
    summaryDetail: shipping
      ? `${order.items.length} product ${order.items.length === 1 ? 'line' : 'lines'} · ${order.country}`
      : kind === 'invoice'
        ? `Order total ${money(total, order.currency)}`
        : `${units} ${units === 1 ? 'unit' : 'units'} · ${order.currency}`,
    paymentInstruction:
      order.status === 'cancelled'
        ? 'This order is cancelled.'
        : order.payment_status !== 'unpaid'
          ? paymentNote(order.payment_status)
          : order.payment_method === 'cod'
            ? 'Payment is due on delivery.'
            : 'Payment will be arranged with the seller.',
    note: `${order.status === 'cancelled' ? 'This order is cancelled. ' : ''}${paymentNote(order.payment_status)}`,
    collect:
      shipping && order.payment_method === 'cod' && due > 0 ? money(due, order.currency) : null,
  };
}
