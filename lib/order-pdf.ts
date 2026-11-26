import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { money, type Order } from './shop-types';
import type { DocumentKind } from './order-utils';
import { documentModel, documentTheme as theme, type DocumentSeller } from './order-document-model';
let fonts: Promise<Buffer[]> | undefined;
export async function orderPdf(
  order: Order,
  kind: DocumentKind,
  seller: DocumentSeller,
): Promise<Buffer> {
  fonts ??= Promise.all(
    ['DejaVuSans-orders.ttf', 'DejaVuSans-Bold-orders.ttf'].map((file) =>
      readFile(path.join(process.cwd(), 'assets/fonts', file)),
    ),
  ).catch((error) => {
    fonts = undefined;
    throw error;
  });
  const [regular, bold] = await fonts;
  const doc = new PDFDocument({
    size: 'A4',
    margin: 44,
    font: 'Helvetica',
    bufferPages: true,
    compress: true,
    info: {
      Title: `${kind === 'shipping' ? 'Shipping invoice' : kind === 'invoice' ? 'Invoice' : 'Order receipt'} DK-${order.number}`,
      Author: seller.name,
      Subject: 'Order document',
    },
  });
  const output = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.registerFont('Body', regular).registerFont('Bold', bold).font('Body');
  const d = documentModel(order, kind, seller);
  const x = 44;
  const w = doc.page.width - 88;
  const bottom = doc.page.height - 76;
  let y = 44;
  function height(text: string, width: number, size = 9, heavy = false) {
    return doc
      .font(heavy ? 'Bold' : 'Body')
      .fontSize(size)
      .heightOfString(text, { width, lineGap: 2 });
  }
  function text(
    value: string,
    tx: number,
    ty: number,
    width: number,
    size = 9,
    color = theme.ink,
    heavy = false,
    align: 'left' | 'right' = 'left',
  ) {
    doc
      .font(heavy ? 'Bold' : 'Body')
      .fontSize(size)
      .fillColor(color)
      .text(value, tx, ty, { width, lineGap: 2, align });
    return height(value, width, size, heavy);
  }
  function rule(ty: number) {
    doc
      .moveTo(x, ty)
      .lineTo(x + w, ty)
      .lineWidth(0.6)
      .strokeColor(theme.line)
      .stroke();
  }
  function box(
    tx: number,
    ty: number,
    width: number,
    h: number,
    fill: string,
    stroke = fill,
    radius = 6,
  ) {
    doc.roundedRect(tx, ty, width, h, radius).fillAndStroke(fill, stroke);
  }
  function newPage() {
    doc.addPage();
    y = 43;
    doc.rect(x, 25, w, 3).fill(theme.accent);
    text(d.storeName, x, y, w * 0.56, 10, theme.ink, true);
    text(`${d.reference} · Continued`, x + w * 0.58, y, w * 0.42, 9, theme.muted, false, 'right');
    y += 27;
    rule(y);
    y += 19;
  }
  function need(h: number) {
    if (y + h > bottom) newPage();
  }
  function label(value: string, tx: number, ty: number, width: number) {
    return text(value.toUpperCase(), tx, ty, width, 7.5, theme.muted, true);
  }
  // Shared brand header and document identity.
  doc.rect(x, 25, w, 3).fill(theme.accent);
  box(x, y, 34, 34, theme.soft, '#efded2', 7);
  text(d.initials, x + 3, y + 8, 28, 12, theme.accent, true, 'left');
  let leftY = y;
  leftY += text(d.storeName, x + 45, leftY, 210, 13, theme.ink, true) + 5;
  for (const value of [
    seller.name.trim().toLowerCase() === d.storeName.trim().toLowerCase() ? undefined : seller.name,
    seller.location,
    seller.email,
  ].filter((value): value is string => !!value))
    leftY += text(value, x + 45, leftY, 210, 8, theme.muted) + 3;
  const rightX = x + w * 0.55;
  const rightW = w * 0.45;
  let rightY = y;
  rightY +=
    text(d.subtitle.toUpperCase(), rightX, rightY, rightW, 7, theme.muted, false, 'right') + 4;
  rightY += text(d.title, rightX, rightY, rightW, 21, theme.ink, true, 'right') + 5;
  rightY += text(d.reference, rightX, rightY, rightW, 11, theme.accent, true, 'right');
  y = Math.max(leftY, rightY) + 15;
  rule(y);
  y += 12;
  const metadata = [
    ['ORDER REFERENCE', d.orderReference],
    ['ORDER PLACED', `${d.dateLabel}\n${d.timeLabel} · Sri Lanka time`],
    ['PAYMENT METHOD', d.method],
    ['CURRENCY', order.currency],
  ];
  const proportions = [0.23, 0.3, 0.31, 0.16];
  let mx = x;
  let metaHeight = 0;
  metadata.forEach(([title, value], i) => {
    const cw = w * proportions[i];
    label(title, mx, y, cw - 10);
    metaHeight = Math.max(metaHeight, text(value, mx, y + 14, cw - 10, 8.5, theme.ink, true));
    mx += cw;
  });
  y += metaHeight + 24;
  rule(y);
  y += 14;
  const settled = order.payment_status === 'paid' && order.status !== 'cancelled';
  const summaryHeight = Math.max(
    80,
    height(d.summaryValue, w * 0.55 - 35, 22, true) + 45,
    height(d.paymentInstruction, w * 0.38, 8) + 42,
  );
  box(
    x,
    y,
    w,
    summaryHeight,
    settled ? theme.greenSoft : theme.soft,
    settled ? '#d5e7d9' : '#efded2',
    7,
  );
  label(d.summaryLabel, x + 18, y + 14, w * 0.55);
  text(d.summaryValue, x + 18, y + 28, w * 0.56 - 20, 22, theme.ink, true);
  text(d.summaryDetail, x + 18, y + summaryHeight - 17, w * 0.56 - 20, 8, theme.muted);
  const sx = x + w * 0.59;
  const sw = w * 0.41 - 18;
  const status = d.shipping ? d.fulfilment : d.status;
  text(status, sx, y + 20, sw, 9, settled ? theme.green : theme.accent, true, 'right');
  text(
    d.shipping ? 'Check quantities against the items below.' : d.paymentInstruction,
    sx,
    y + 40,
    sw,
    8,
    theme.muted,
    false,
    'right',
  );
  y += summaryHeight + 19;
  // Recipient and dispatch/payment information form two balanced columns.
  const gap = 27;
  const cw = (w - gap) / 2;
  let ly = y;
  let ry = y;
  label(
    d.shipping
      ? 'DELIVER TO'
      : kind === 'invoice'
        ? 'BILL TO / DELIVER TO'
        : 'CUSTOMER / DELIVER TO',
    x,
    ly,
    cw,
  );
  ly += 15;
  ly += text(order.name, x, ly, cw, 11, theme.ink, true) + 4;
  for (const value of [order.address, `${order.city} ${order.postal_code}`, order.country])
    ly += text(value, x, ly, cw, 8.5, theme.muted) + 1;
  ly += 4;
  ly += text(order.email, x, ly, cw, 8.5, theme.muted) + 3;
  ly += text(order.phone, x, ly, cw, 8.5, theme.muted);
  const rx = x + cw + gap;
  label(d.shipping ? 'SHIPMENT DETAILS' : 'ORDER DETAILS', rx, ry, cw);
  ry += 15;
  for (const [title, value] of [
    ['Fulfilment', d.fulfilment],
    ['Payment', d.payment],
    ['Tracking reference', order.tracking || 'Not assigned'],
  ]) {
    const h = Math.max(height(title, 90, 8), height(value, cw - 98, 8.5, true));
    text(title, rx, ry, 90, 8, theme.muted);
    text(value, rx + 98, ry, cw - 98, 8.5, theme.ink, true);
    ry += h + 10;
  }
  if (d.collect) {
    ry += 3;
    text('Collect on delivery', rx, ry, cw, 8, theme.muted);
    ry += 15;
    ry += text(d.collect, rx, ry, cw, 13, theme.ink, true);
  }
  y = Math.max(ly, ry) + 20;
  function tableHeader() {
    need(51);
    label(d.shipping ? 'PACKING LIST' : 'ORDER ITEMS', x, y, w * 0.5);
    text(
      `${d.units} ${d.units === 1 ? 'unit' : 'units'} · ${order.items.length} product ${order.items.length === 1 ? 'line' : 'lines'}`,
      x + w * 0.5,
      y,
      w * 0.5,
      7.5,
      theme.muted,
      false,
      'right',
    );
    y += 19;
    doc.rect(x, y, w, 25).fill(theme.table);
    const columns = d.shipping
      ? [
          ['Check', 0, 0.09],
          ['Product / description', 0.09, 0.72],
          ['Qty', 0.81, 0.19],
        ]
      : [
          ['#', 0, 0.06],
          ['Product / description', 0.06, 0.42],
          ['Qty', 0.48, 0.08],
          ['Unit price', 0.56, 0.22],
          ['Amount', 0.78, 0.22],
        ];
    for (const [title, start, span] of columns as [string, number, number][])
      text(
        title,
        x + w * start + 8,
        y + 8,
        w * span - 16,
        7.5,
        theme.muted,
        true,
        start >= 0.48 ? 'right' : 'left',
      );
    y += 25;
  }
  tableHeader();
  for (const [index, item] of order.items.entries()) {
    const itemX = x + w * (d.shipping ? 0.09 : 0.06) + 8;
    const itemW = w * (d.shipping ? 0.72 : 0.42) - 16;
    const nameH = height(item.name, itemW, 9, true);
    const refH = item.slug ? height(`Ref. ${item.slug}`, itemW, 7) : 0;
    const rowH = Math.max(38, nameH + refH + (item.slug ? 5 : 0) + 16);
    if (y + rowH > bottom) {
      newPage();
      tableHeader();
    }
    if (d.shipping)
      doc
        .roundedRect(x + 9, y + 13, 10, 10, 1)
        .lineWidth(0.6)
        .strokeColor('#9aa59e')
        .stroke();
    else text(String(index + 1).padStart(2, '0'), x + 8, y + 12, w * 0.06 - 10, 8, theme.muted);
    text(item.name, itemX, y + 11, itemW, 9, theme.ink, true);
    if (item.slug) text(`Ref. ${item.slug}`, itemX, y + 14 + nameH, itemW, 7, theme.muted);
    const qtyStart = d.shipping ? 0.81 : 0.48;
    const qtyWidth = d.shipping ? 0.19 : 0.08;
    text(
      String(item.quantity),
      x + w * qtyStart + 8,
      y + 12,
      w * qtyWidth - 16,
      9,
      theme.ink,
      false,
      'right',
    );
    if (!d.shipping) {
      text(
        money(item.price, order.currency),
        x + w * 0.56 + 8,
        y + 12,
        w * 0.22 - 16,
        8.5,
        theme.ink,
        false,
        'right',
      );
      text(
        money(item.quantity * item.price, order.currency),
        x + w * 0.78 + 8,
        y + 12,
        w * 0.22 - 16,
        8.5,
        theme.ink,
        true,
        'right',
      );
    }
    y += rowH;
    rule(y);
  }
  y += 17;
  if (!d.shipping) {
    need(111);
    const tx = x + w * 0.56;
    const tw = w * 0.44;
    label(kind === 'receipt' ? 'PAYMENT ACKNOWLEDGEMENT' : 'PAYMENT INFORMATION', x, y, w * 0.49);
    let py = y + 16;
    py += text(d.note, x, py, w * 0.49, 8, theme.muted) + 6;
    py += text(d.paymentInstruction, x, py, w * 0.49, 8, theme.muted) + 8;
    text(
      `Please use ${d.orderReference} as your order reference.`,
      x,
      py,
      w * 0.49,
      7.5,
      theme.muted,
    );
    let ty = y;
    for (const [title, value] of [
      ['Subtotal', money(order.subtotal, order.currency)],
      ['Delivery', money(order.shipping, order.currency)],
      ['Order total', money(d.total, order.currency)],
    ]) {
      text(title, tx, ty, tw * 0.45, 9, theme.muted, title === 'Order total');
      text(value, tx + tw * 0.45, ty, tw * 0.55, 9, theme.ink, true, 'right');
      ty += 21;
      if (title === 'Delivery')
        doc
          .moveTo(tx, ty - 7)
          .lineTo(tx + tw, ty - 7)
          .strokeColor(theme.line)
          .stroke();
    }
    box(tx - 8, ty - 2, tw + 16, 30, theme.soft, theme.soft, 4);
    text('Amount due', tx, ty + 7, tw * 0.45, 9, theme.ink, true);
    text(
      money(d.due, order.currency),
      tx + tw * 0.45,
      ty + 7,
      tw * 0.55,
      9,
      theme.ink,
      true,
      'right',
    );
    y = Math.max(ty + 34, py + 17);
  } else {
    need(103);
    label('PACKAGE HANDOVER', x, y, w);
    y += 17;
    text('Confirm the contents before handing over this order.', x, y, w, 8, theme.muted);
    y += 30;
    const signatures = [
      ['Packed by', 0, 0.35],
      ['Received by', 0.37, 0.35],
      ['Date', 0.75, 0.25],
    ] as [string, number, number][];
    for (const [title, start, span] of signatures) {
      text(title, x + w * start, y, w * span, 8, theme.muted);
      doc
        .moveTo(x + w * start, y + 29)
        .lineTo(x + w * (start + span) - 12, y + 29)
        .lineWidth(0.5)
        .strokeColor('#9aa59e')
        .stroke();
    }
    y += 45;
  }
  if (order.notes) {
    const noteHeight = height(order.notes, w, 8);
    need(noteHeight + 38);
    rule(y);
    label(d.shipping ? 'DELIVERY INSTRUCTIONS' : 'CUSTOMER NOTE', x, y + 12, w);
    text(order.notes, x, y + 26, w, 8, theme.muted);
    y += noteHeight + 38;
  }
  const closingH = d.shipping ? height(d.note, w * 0.6, 7.5) + 40 : 53;
  need(closingH);
  y += 7;
  rule(y);
  y += 14;
  text(
    d.shipping ? 'Packed with care.' : 'Thank you for your order.',
    x,
    y,
    w * 0.57,
    10,
    theme.ink,
    true,
  );
  text(
    d.shipping ? d.note : `For any questions, please quote ${d.orderReference}.`,
    x,
    y + 18,
    w * 0.57,
    7.5,
    theme.muted,
  );
  const contacts = [seller.website?.replace(/^https?:\/\//, ''), seller.email].filter(
    (v): v is string => !!v,
  );
  let cy = y;
  for (const value of contacts) {
    cy += text(value, x + w * 0.63, cy, w * 0.37, 7.5, theme.muted, false, 'right') + 3;
  }
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.font('Body').fontSize(7).fillColor(theme.muted);
    const fy = doc.page.height - 37;
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.text(`${d.reference} · ${order.currency}`, x, fy, { width: w * 0.6, lineBreak: false });
    doc.text(`Page ${i + 1} of ${pages.count}`, x + w * 0.6, fy, {
      width: w * 0.4,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = originalBottom;
  }
  doc.end();
  return output;
}
