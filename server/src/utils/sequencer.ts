import pool from '../config/database';

const year = new Date().getFullYear();

async function nextSequence(table: string, column: string, prefix: string): Promise<string> {
  const pattern = `${prefix}${year}-%`;
  const fullPrefix = `${prefix}${year}-`;

  const { rows } = await pool.query<{ next: string }>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(${column}, $1) AS INTEGER)), 0) + 1 AS next
     FROM ${table}
     WHERE ${column} ILIKE $2`,
    [fullPrefix.length + 1, pattern]
  );

  const seq = String(rows[0].next).padStart(5, '0');
  return `${fullPrefix}${seq}`;
}

export async function nextOrderNumber(): Promise<string> {
  return nextSequence('orders', 'order_number', 'ORD-');
}

export async function nextInvoiceNumber(): Promise<string> {
  return nextSequence('invoices', 'invoice_number', 'INV-');
}

export async function nextPoNumber(): Promise<string> {
  return nextSequence('purchase_orders', 'po_number', 'PO-');
}

export async function nextShipmentNumber(): Promise<string> {
  return nextSequence('shipments', 'shipment_number', 'SHP-');
}
