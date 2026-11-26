import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { money, type Order } from './shop-types';
import { documentTitles, paymentNote, type DocumentKind } from './order-utils';
let font: Promise<Buffer> | undefined;
export async function orderPdf(
  order: Order,
  kind: DocumentKind,
  seller: { name: string; email: string },
): Promise<Buffer> {
  font ??= readFile(path.join(process.cwd(), 'assets/fonts/DejaVuSans-orders.ttf')).catch(
    (error) => {
      font = undefined;
      throw error;
    },
  );
  const fontBytes = await font;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    font: 'Helvetica',
    compress: true,
    info: { Title: `${documentTitles[kind]} DK-${order.number}`, Author: seller.name },
  });
  doc.font(fontBytes);
  const output = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const shipping = kind === 'shipping';
  const width = doc.page.width - 96;
  function room(height: number) {
    if (doc.y + height > doc.page.height - 60) doc.addPage();
  }
  function line(text: string, size = 10, color = '#222a23') {
    doc.fontSize(size).fillColor(color).text(text, 48, doc.y, { width, lineGap: 4 });
  }
  function gap() {
    doc.moveDown(0.8);
  }
  function label(text: string) {
    room(45);
    gap();
    line(text.toUpperCase(), 9, '#456642');
    gap();
  }
  function row(left: string, right: string) {
    room(38);
    const y = doc.y;
    doc.fontSize(10).fillColor('#222a23');
    const leftHeight = doc.heightOfString(left, { width: width * 0.62 });
    const rightHeight = doc.heightOfString(right, { width: width * 0.34 });
    doc.text(left, 48, y, { width: width * 0.62 });
    doc.text(right, 48 + width * 0.66, y, { width: width * 0.34, align: 'right' });
    doc.y = y + Math.max(leftHeight, rightHeight) + 10;
  }
  line(seller.name, 13, '#456642');
  line(seller.email, 9, '#5a625a');
  gap();
  line(documentTitles[kind], 26);
  line(`${kind === 'invoice' ? 'INV' : shipping ? 'SHP' : 'REC'}-${order.number}`, 13);
  line(
    `Order DK-${order.number} | ${new Date(order.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' })}`,
    9,
  );
  line(`Status: ${order.status} | Payment: ${order.payment_status}`, 9);
  gap();
  label(shipping ? 'Deliver to' : 'Customer / bill to');
  line(order.name, 12);
  line(order.address);
  line(`${order.city} ${order.postal_code}`);
  line(order.country);
  line(order.email);
  line(order.phone);
  label(shipping ? 'Dispatch details' : 'Payment details');
  line(`Method: ${order.payment_method === 'cod' ? 'Cash on delivery' : 'Arranged payment'}`);
  line(`Currency: ${order.currency}`);
  if (order.tracking) line(`Tracking / delivery reference: ${order.tracking}`);
  label('Order items');
  for (const item of order.items) {
    const nameHeight = doc.fontSize(11).heightOfString(item.name, { width });
    room(nameHeight + 65);
    line(item.name, 11);
    if (shipping) line(`Quantity: ${item.quantity}`, 10, '#5a625a');
    else
      row(
        `${item.quantity} x ${money(item.price, order.currency)}`,
        money(item.quantity * item.price, order.currency),
      );
    gap();
  }
  if (!shipping) {
    room(180);
    label('Order totals');
    row('Subtotal', money(order.subtotal, order.currency));
    row('Delivery', money(order.shipping, order.currency));
    row('Total', money(order.subtotal + order.shipping, order.currency));
    row(
      'Amount due',
      money(
        order.payment_status === 'unpaid' && order.status !== 'cancelled'
          ? order.subtotal + order.shipping
          : 0,
        order.currency,
      ),
    );
  } else {
    room(140);
    label('Handover');
    line(`Total units: ${order.items.reduce((sum, i) => sum + i.quantity, 0)}`);
    if (
      order.payment_method === 'cod' &&
      order.payment_status === 'unpaid' &&
      order.status !== 'cancelled'
    )
      line(`Collect on delivery: ${money(order.subtotal + order.shipping, order.currency)}`);
    gap();
    line('Packed by: __________________________');
    gap();
    line('Received by: ________________________');
  }
  if (order.notes) {
    room(80);
    label(shipping ? 'Delivery note' : 'Customer note');
    line(order.notes);
  }
  room(80);
  gap();
  line(
    `${order.status === 'cancelled' ? 'This order is cancelled. ' : ''}${paymentNote(order.payment_status)}`,
    9,
    '#5a625a',
  );
  line(
    shipping
      ? 'Shipping and packing document.'
      : 'Please quote your order reference when contacting us.',
    9,
    '#5a625a',
  );
  doc.end();
  return output;
}
