export const orderStatuses = ['new', 'confirmed', 'shipped', 'completed', 'cancelled'] as const;
export const paymentStatuses = ['unpaid', 'paid', 'refunded'] as const;
export const documentKinds = ['receipt', 'invoice', 'shipping'] as const;
export type DocumentKind = (typeof documentKinds)[number];
export const documentTitles: Record<DocumentKind, string> = {
  receipt: 'Order receipt',
  invoice: 'Invoice',
  shipping: 'Shipping invoice',
};
export const orderLabels: Record<string, string> = {
  active: 'In fulfilment',
  new: 'New',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  unpaid: 'Unpaid',
  paid: 'Paid',
  refunded: 'Refunded',
};
export const ORDER_PAGE_SIZE = 25;
export function orderFilters(params: Record<string, string | string[] | undefined>) {
  const single = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : '');
  const status = [...orderStatuses, 'active'].includes(single('status')) ? single('status') : '';
  const payment = [...paymentStatuses, 'due'].includes(single('payment')) ? single('payment') : '';
  const page = Number(single('page'));
  return {
    q: single('q').trim().slice(0, 150),
    status,
    payment,
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1,
    sort: single('sort') === 'oldest' ? 'oldest' : 'newest',
  };
}
export function orderHref(
  filters: ReturnType<typeof orderFilters>,
  changes: Record<string, string | number> = {},
) {
  const values = { ...filters, ...changes };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== '' && !(key === 'page' && value === 1) && !(key === 'sort' && value === 'newest'))
      query.set(key, String(value));
  return `/admin/orders${query.size ? '?' + query : ''}`;
}
export function paymentNote(status: string) {
  return status === 'paid'
    ? 'Payment recorded as received.'
    : status === 'refunded'
      ? 'Payment recorded as refunded.'
      : 'Payment has not been recorded as received.';
}

export function orderDate(value: Date | string) {
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Colombo',
  });
}
