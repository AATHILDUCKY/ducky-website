import 'server-only';
import { pool } from './db';
import type { PaymentProof } from './payment-proof-types';
export async function getPaymentProofs(orderId: string): Promise<PaymentProof[]> {
  return (
    await pool.query(
      'SELECT id,order_id,filename,mime,status,review_note,created_at,reviewed_at FROM shop_payment_proofs WHERE order_id=$1 ORDER BY created_at DESC,id DESC',
      [orderId],
    )
  ).rows;
}
