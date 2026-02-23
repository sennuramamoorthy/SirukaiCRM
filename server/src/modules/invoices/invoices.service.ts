import pool from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';
import { nextInvoiceNumber } from '../../utils/sequencer';

export async function listInvoices(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];
  let idx = 1;

  if (query.status) { where += ` AND i.status = $${idx}`; params.push(query.status); idx++; }
  if (query.customer_id) { where += ` AND i.customer_id = $${idx}`; params.push(Number(query.customer_id)); idx++; }

  const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM invoices i ${where}`, params);
  const total = parseInt(countResult.rows[0].cnt, 10);

  const { rows } = await pool.query(
    `SELECT i.*, c.name as customer_name, o.order_number
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     JOIN orders o ON o.id = i.order_id
     ${where} ORDER BY i.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return { rows, meta: paginationMeta(total, page, limit) };
}

export async function getInvoiceById(id: number) {
  const { rows: invRows } = await pool.query(
    `SELECT i.*, c.name as customer_name, c.email as customer_email,
            c.billing_address, c.company as customer_company,
            o.order_number
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     JOIN orders o ON o.id = i.order_id
     WHERE i.id = $1`,
    [id]
  );
  if (!invRows[0]) return null;

  const { rows: items } = await pool.query(
    `SELECT oi.*, p.name as product_name, p.sku
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = (SELECT order_id FROM invoices WHERE id = $1)`,
    [id]
  );

  return { ...invRows[0], items };
}

export async function generateFromOrder(orderId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existing } = await client.query(
      'SELECT id FROM invoices WHERE order_id = $1',
      [orderId]
    );
    if (existing.length > 0) throw new Error('Invoice already exists for this order');

    const { rows: orderRows } = await client.query(
      `SELECT o.*, c.id as customer_id FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = $1`,
      [orderId]
    );
    const order = orderRows[0];
    if (!order) throw new Error('Order not found');
    if (!['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      throw new Error('Order must be confirmed before generating an invoice');
    }

    const invoiceNumber = await nextInvoiceNumber();
    const dueDate = Date.now() + 30 * 24 * 60 * 60 * 1000;

    const { rows } = await client.query(
      `INSERT INTO invoices (invoice_number, order_id, customer_id, status,
       subtotal_cents, tax_cents, discount_cents, total_cents, due_date)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8) RETURNING id`,
      [invoiceNumber, orderId, order.customer_id,
       order.subtotal_cents, order.tax_cents, order.discount_cents, order.total_cents, dueDate]
    );

    await client.query('COMMIT');
    return getInvoiceById(rows[0].id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInvoiceStatus(id: number, data: { status: string; amount_paid_cents?: number; notes?: string }) {
  const now = Date.now();
  const { rows: invRows } = await pool.query('SELECT status FROM invoices WHERE id = $1', [id]);
  if (!invRows[0]) throw new Error('Invoice not found');

  const setClauses: string[] = ['status = $1', 'updated_at = $2'];
  const params: (string | number | null)[] = [data.status, now];
  let idx = 3;

  if (data.amount_paid_cents !== undefined) { setClauses.push(`amount_paid_cents = $${idx}`); params.push(data.amount_paid_cents); idx++; }
  if (data.notes !== undefined) { setClauses.push(`notes = $${idx}`); params.push(data.notes); idx++; }
  if (data.status === 'sent') { setClauses.push(`sent_at = $${idx}`); params.push(now); idx++; }
  if (data.status === 'paid') { setClauses.push(`paid_at = $${idx}`); params.push(now); idx++; }

  params.push(id);
  await pool.query(`UPDATE invoices SET ${setClauses.join(', ')} WHERE id = $${idx}`, params);

  return getInvoiceById(id);
}
