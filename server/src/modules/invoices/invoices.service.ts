import db from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';
import { nextInvoiceNumber } from '../../utils/sequencer';

export function listInvoices(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (query.status) { where += ' AND i.status = ?'; params.push(query.status); }
  if (query.customer_id) { where += ' AND i.customer_id = ?'; params.push(Number(query.customer_id)); }

  const total = (db.prepare(
    `SELECT COUNT(*) as cnt FROM invoices i ${where}`
  ).get(...params) as { cnt: number }).cnt;

  const rows = db.prepare(
    `SELECT i.*, c.name as customer_name, o.order_number
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     JOIN orders o ON o.id = i.order_id
     ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { rows, meta: paginationMeta(total, page, limit) };
}

export function getInvoiceById(id: number) {
  const invoice = db.prepare(
    `SELECT i.*, c.name as customer_name, c.email as customer_email,
            c.billing_address, c.company as customer_company,
            o.order_number
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     JOIN orders o ON o.id = i.order_id
     WHERE i.id = ?`
  ).get(id);

  if (!invoice) return null;

  const items = db.prepare(
    `SELECT oi.*, p.name as product_name, p.sku
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = (SELECT order_id FROM invoices WHERE id = ?)`
  ).all(id);

  return { ...(invoice as object), items };
}

export function generateFromOrder(orderId: number) {
  return db.transaction(() => {
    // Check for existing invoice
    const existing = db.prepare('SELECT id FROM invoices WHERE order_id = ?').get(orderId);
    if (existing) throw new Error('Invoice already exists for this order');

    const order = db.prepare(
      `SELECT o.*, c.id as customer_id FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = ?`
    ).get(orderId) as {
      id: number; customer_id: number; status: string;
      subtotal_cents: number; tax_cents: number; discount_cents: number; total_cents: number;
    } | undefined;

    if (!order) throw new Error('Order not found');
    if (!['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      throw new Error('Order must be confirmed before generating an invoice');
    }

    const invoiceNumber = nextInvoiceNumber();
    const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000; // Net 30

    const result = db.prepare(
      `INSERT INTO invoices (invoice_number, order_id, customer_id, status,
       subtotal_cents, tax_cents, discount_cents, total_cents, due_date)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)`
    ).run(
      invoiceNumber, orderId, order.customer_id,
      order.subtotal_cents, order.tax_cents, order.discount_cents, order.total_cents, dueDate
    ) as { lastInsertRowid: number };

    return getInvoiceById(result.lastInsertRowid);
  })();
}

export function updateInvoiceStatus(id: number, data: { status: string; amount_paid_cents?: number; notes?: string }) {
  const now = Date.now();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as { status: string } | undefined;
  if (!invoice) throw new Error('Invoice not found');

  const updates: Record<string, string | number | null> = { status: data.status, updated_at: now };
  if (data.amount_paid_cents !== undefined) updates.amount_paid_cents = data.amount_paid_cents;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.status === 'sent') updates.sent_at = now;
  if (data.status === 'paid') updates.paid_at = now;

  const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE invoices SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), id);

  return getInvoiceById(id);
}
