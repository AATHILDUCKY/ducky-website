'use client';
import { Printer } from 'lucide-react';
export function PrintDocument({ label = 'Print document / Save PDF' }: { label?: string }) {
  return (
    <button className="shop-button shop-print-button" onClick={() => window.print()}>
      <Printer size={17} />
      {label}
    </button>
  );
}
