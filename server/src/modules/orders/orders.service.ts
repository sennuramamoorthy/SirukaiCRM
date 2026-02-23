import pool from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';
import { nextOrderNumber } from '../../utils/sequencer';
import { reserveStock, releaseReservation, deductStock } from '../inventory/inventory.service';

interface OrderItem {
  product_id: number;
  quantity: number;
  unit_price_cents: number;
  discount_pct: number;
}

function calcLineTotals(items: OrderItem[]) {
  return items.map((item) => ({
    ...item,
    line_total_cents: Math.round(item.unit_price_cents * item.quantity * (1 - item.discount_pct / 100)),
  }));
}

function calcOrderTotals(items: ReturnType<typeof calcLineTotals>, discountCents: number, taxCents: number) {
  const subtotal = items.reduce((s, i) => s + i.line_total_cents, 0);
  return { subtotal_cents: subtotal, discount_cents: discountCents, tax_cents: taxCents, total_cents: subtotal - discountCents + taxCents };
}

export async function listOrders(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];
  let idx = 1;

  if (query.status) { where += ` AND o.status = $${idx}`; params.push(query.status); idx++; }
  if (query.customer_id) { where += ` AND o.customer_id = $${idx}`; params.push(Number(query.customer_id)); idx++; }
  if (query.search) {
    where += ` AND (o.order_number ILIKE $${idx} OR c.name ILIKE $${idx + 1})`;
    params.push(`%${query.search}%`, `%${query.search}%`);
    idx += 2;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) as cnt FROM orders o JOIN customers c ON c.id = o.customer_id ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].cnt, 10);

  const { rows } = await pool.query(
    `SELECT o.*, c.name as customer_name,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
     FROM orders o JOIN customers c ON c.id = o.customer_id
     ${where} ORDER BY o.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return { rows, meta: paginationMeta(total, page, limit) };
}

export async function getOrderById(id: number) {
  const { rows: orderRows } = await pool.query(
    `SELECT o.*, c.name as customer_name, c.email as customer_email
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = $1`,
    [id]
  );
  if (!orderRows[0]) return null;

  const { rows: items } = await pool.query(
    `SELECT oi.*, p.name as product_name, p.sku
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [id]
  );

  return { ...orderRows[0], items };
}

export async function createOrder(
  data: { customer_id: number; shipping_address?: string | null; notes?: string | null; discount_cents: number; tax_cents: number; items: OrderItem[] },
  userId: number
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemsWithTotals = calcLineTotals(data.items);
    const totals = calcOrderTotals(itemsWithTotals, data.discount_cents, data.tax_cents);
    const orderNumber = await nextOrderNumber();

    const { rows } = await client.query(
      `INSERT INTO orders (order_number, customer_id, assigned_to, status, shipping_address, notes,
       subtotal_cents, discount_cents, tax_cents, total_cents)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9) RETURNING id`,
      [orderNumber, data.customer_id, userId, data.shipping_address ?? null, data.notes ?? null,
       totals.subtotal_cents, totals.discount_cents, totals.tax_cents, totals.total_cents]
    );
    const orderId = rows[0].id;

    for (const item of itemsWithTotals) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, discount_pct, line_total_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.product_id, item.quantity, item.unit_price_cents, item.discount_pct, item.line_total_cents]
      );
    }

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export async function updateOrderStatus(orderId: number, newStatus: string, userId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderRows[0];
    if (!order) throw new Error('Order not found');

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
    }

    const now = Date.now();
    const setClauses: string[] = ['status = $1', 'updated_at = $2'];
    const updateParams: (string | number)[] = [newStatus, now];
    let paramIdx = 3;

    if (newStatus === 'confirmed') {
      setClauses.push(`ordered_at = $${paramIdx}`);
      updateParams.push(now);
      paramIdx++;

      const { rows: items } = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );
      for (const item of items) {
        await reserveStock(client, item.product_id, item.quantity, orderId, userId);
      }
    }

    if (newStatus === 'shipped') {
      setClauses.push(`shipped_at = $${paramIdx}`);
      updateParams.push(now);
      paramIdx++;

      const { rows: items } = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );
      for (const item of items) {
        await deductStock(client, item.product_id, item.quantity, orderId, userId);
      }
    }

    if (newStatus === 'delivered') {
      setClauses.push(`delivered_at = $${paramIdx}`);
      updateParams.push(now);
      paramIdx++;
    }

    if (newStatus === 'cancelled') {
      setClauses.push(`cancelled_at = $${paramIdx}`);
      updateParams.push(now);
      paramIdx++;

      if (['confirmed', 'processing'].includes(order.status)) {
        const { rows: items } = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [orderId]
        );
        for (const item of items) {
          await releaseReservation(client, item.product_id, item.quantity, orderId, userId);
        }
      }
    }

    updateParams.push(orderId);
    await client.query(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      updateParams
    );

    await client.query('COMMIT');
    return getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateOrder(id: number, data: { shipping_address?: string | null; notes?: string | null; discount_cents?: number; tax_cents?: number }) {
  const { rows: orderRows } = await pool.query('SELECT status FROM orders WHERE id = $1', [id]);
  if (!orderRows[0]) throw new Error('Order not found');
  if (orderRows[0].status !== 'draft') throw new Error('Only draft orders can be edited');

  const now = Date.now();
  await pool.query(
    `UPDATE orders SET shipping_address=$1, notes=$2,
     discount_cents=COALESCE($3, discount_cents),
     tax_cents=COALESCE($4, tax_cents), updated_at=$5 WHERE id = $6`,
    [data.shipping_address ?? null, data.notes ?? null, data.discount_cents ?? null, data.tax_cents ?? null, now, id]
  );

  await recalcOrderTotals(id);
  return getOrderById(id);
}

async function recalcOrderTotals(orderId: number) {
  const { rows: items } = await pool.query(
    'SELECT line_total_cents FROM order_items WHERE order_id = $1',
    [orderId]
  );
  const { rows: orderRows } = await pool.query(
    'SELECT discount_cents, tax_cents FROM orders WHERE id = $1',
    [orderId]
  );
  const order = orderRows[0];
  const subtotal = items.reduce((s: number, i: { line_total_cents: string }) => s + Number(i.line_total_cents), 0);
  const total = subtotal - Number(order.discount_cents) + Number(order.tax_cents);
  await pool.query(
    'UPDATE orders SET subtotal_cents = $1, total_cents = $2, updated_at = $3 WHERE id = $4',
    [subtotal, total, Date.now(), orderId]
  );
}

export async function deleteOrder(id: number) {
  const { rows } = await pool.query('SELECT status FROM orders WHERE id = $1', [id]);
  if (!rows[0]) throw new Error('Order not found');
  if (rows[0].status !== 'draft') throw new Error('Only draft orders can be deleted');
  await pool.query('DELETE FROM orders WHERE id = $1', [id]);
}
