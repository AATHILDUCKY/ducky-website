import 'server-only';
import { pool } from './db';
export async function getNewRequestCount(): Promise<number> {
  return (
    await pool.query("SELECT count(*)::int AS count FROM contact_requests WHERE status='new'")
  ).rows[0].count;
}
export function requestDate(value: Date | string) {
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Colombo',
  });
}
