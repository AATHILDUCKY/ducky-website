export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const MAX_ORDER_PROOFS = 5;
export const PROOF_ACCEPT =
  'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
export type PaymentProof = {
  id: string;
  order_id: string;
  filename: string;
  mime: string;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
};
