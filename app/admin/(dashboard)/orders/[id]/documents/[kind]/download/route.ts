import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { getOrder } from '@/lib/orders';
import { getDocumentSeller } from '@/lib/order-document-seller';
import { documentKinds } from '@/lib/order-utils';
import { orderPdf } from '@/lib/order-pdf';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
};
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  if (!(await isAdmin()))
    return Response.json(
      { error: 'Sign in to download order documents.' },
      { status: 401, headers: privateHeaders },
    );
  const { id, kind } = await params;
  const parsed = z.enum(documentKinds).safeParse(kind);
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return Response.json(
      { error: 'Document not found.' },
      { status: 404, headers: privateHeaders },
    );
  try {
    const [order, seller] = await Promise.all([getOrder(id), getDocumentSeller()]);
    if (!order)
      return Response.json({ error: 'Order not found.' }, { status: 404, headers: privateHeaders });
    const pdf = await orderPdf(order, parsed.data, seller);
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="DK-${order.number}-${parsed.data}.pdf"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (error) {
    console.error(
      'Order document generation failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return Response.json(
      { error: 'Could not generate this document. Please try again.' },
      { status: 503, headers: privateHeaders },
    );
  }
}
