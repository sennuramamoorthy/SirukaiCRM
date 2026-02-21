import db from '../../config/database';
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

export function listOrders(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];

  if (query.status) { where += ' AND o.status = ?'; params.push(query.status); }
  if (query.customer_id) { where += ' AND o.customer_id = ?'; params.push(Number(query.customer_id)); }
  if (query.search) {
    where += ' AND (o.order_number LIKE ? OR c.name LIKE ?)';
    params.push(`%${query.search}%`, `%${query.search}%`);
  }

  const total = (db.prepare(
    `SELECT COUNT(*) as cnt FROM orders o JOIN customers c ON c.id = o.customer_id ${where}`
  ).get(...params) as { cnt: number }).cnt;

  const rows = db.prepare(
    `SELECT o.*, c.name as customer_name,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
     FROM orders o JOIN customers c ON c.id = o.customer_id
     ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { rows, meta: paginationMeta(total, page, limit) };
}

export function getOrderById(id: number) {
  const order = db.prepare(
    `SELECT o.*, c.name as customer_name, c.email as customer_email
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
  ).get(id);
  if (!order) return null;

  const items = db.prepare(
    `SELECT oi.*, p.name as product_name, p.sku
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`
  ).all(id);

  return { ...(order as object), items };
}

export function createOrder(
  data: { customer_id: number; shipping_address?: string | null; notes?: string | null; discount_cents: number; tax_cents: number; items: OrderItem[] },
  userId: number
) {
  return db.transaction(() => {
    const itemsWithTotals = calcLineTotals(data.items);
    const totals = calcOrderTotals(itemsWithTotals, data.discount_cents, data.tax_cents);
    const orderNumber = nextOrderNumber();

    const result = db.prepare(
      `INSERT INTO orders (order_number, customer_id, assigned_to, status, shipping_address, notes,
       subtotal_cents, discount_cents, tax_cents, total_cents)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`
    ).run(
      orderNumber, data.customer_id, userId, data.shipping_address ?? null, data.notes ?? null,
      totals.subtotal_cents, totals.discount_cents, totals.tax_cents, totals.total_cents
    ) as { lastInsertRowid: number };

    const orderId = result.lastInsertRowid;

    for (const item of itemsWithTotals) {
      db.prepare(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, discount_pct, line_total_cents)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(orderId, item.product_id, item.quantity, item.unit_price_cents, item.discount_pct, item.line_total_cents);
    }

    return getOrderById(orderId);
  })();
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function updateOrderStatus(orderId: number, newStatus: string, userId: number) {
  return db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as {
      id: number; status: string; customer_id: number;
    } | undefined;
    if (!order) throw new Error('Order not found');

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from ${order.status} to ${newStatus}`);
    }

    const now = Date.now();
    const updates: Record<string, number | string> = { status: newStatus, updated_at: now };

    if (newStatus === 'confirmed') {
      updates.ordered_at = now;
      // Reserve inventory
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId) as { product_id: number; quantity: number }[];
      for (const item of items) {
        reserveStock(item.product_id, item.quantity, orderId, userId);
      }
    }

    if (newStatus === 'shipped') {
      updates.shipped_at = now;
      // Deduct inventory
      const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId) as { product_id: number; quantity: number }[];
      for (const item of items) {
        deductStock(item.product_id, item.quantity, orderId, userId);
      }
    }

    if (newStatus === 'delivered') {
      updates.delivered_at = now;
    }

    if (newStatus === 'cancelled') {
      updates.cancelled_at = now;
      if (['confirmed', 'processing'].includes(order.status)) {
        // Release inventory reservations
        const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').all(orderId) as { product_id: number; quantity: number }[];
        for (const item of items) {
          releaseReservation(item.product_id, item.quantity, orderId, userId);
        }
      }
    }

    const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE orders SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), orderId);

    return getOrderById(orderId);
  })();
}

export function updateOrder(id: number, data: { shipping_address?: string | null; notes?: string | null; discount_cents?: number; tax_cents?: number }) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as { status: string } | undefined;
  if (!order) throw new Error('Order not found');
  if (order.status !== 'draft') throw new Error('Only draft orders can be edited');

  const now = Date.now();
  db.prepare(
    `UPDATE orders SET shipping_address=@shipping_address, notes=@notes,
     discount_cents=COALESCE(@discount_cents, discount_cents),
     tax_cents=COALESCE(@tax_cents, tax_cents), updated_at=@now WHERE id = @id`
  ).run({ ...data, now, id });

  // Recalculate totals
  recalcOrderTotals(id);
  return getOrderById(id);
}

function recalcOrderTotals(orderId: number) {
  const items = db.prepare('SELECT line_total_cents FROM order_items WHERE order_id = ?').all(orderId) as { line_total_cents: number }[];
  const order = db.prepare('SELECT discount_cents, tax_cents FROM orders WHERE id = ?').get(orderId) as { discount_cents: number; tax_cents: number };
  const subtotal = items.reduce((s, i) => s + i.line_total_cents, 0);
  const total = subtotal - order.discount_cents + order.tax_cents;
  db.prepare('UPDATE orders SET subtotal_cents = ?, total_cents = ?, updated_at = ? WHERE id = ?')
    .run(subtotal, total, Date.now(), orderId);
}

export function deleteOrder(id: number) {
  const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id) as { status: string } | undefined;
  if (!order) throw new Error('Order not found');
  if (order.status !== 'draft') throw new Error('Only draft orders can be deleted');
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
}
