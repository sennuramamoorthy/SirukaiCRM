import db from '../config/database';

const year = new Date().getFullYear();

function nextSequence(table: string, column: string, prefix: string): string {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(CAST(SUBSTR(${column}, LENGTH(@prefix) + 1) AS INTEGER)), 0) + 1 AS next
       FROM ${table}
       WHERE ${column} LIKE @pattern`
    )
    .get({ prefix: `${prefix}${year}-`, pattern: `${prefix}${year}-%` }) as { next: number };

  const seq = String(row.next).padStart(5, '0');
  return `${prefix}${year}-${seq}`;
}

export function nextOrderNumber(): string {
  return nextSequence('orders', 'order_number', 'ORD-');
}

export function nextInvoiceNumber(): string {
  return nextSequence('invoices', 'invoice_number', 'INV-');
}

export function nextPoNumber(): string {
  return nextSequence('purchase_orders', 'po_number', 'PO-');
}

export function nextShipmentNumber(): string {
  return nextSequence('shipments', 'shipment_number', 'SHP-');
}
