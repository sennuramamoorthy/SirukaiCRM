import pool from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';
import { nextPoNumber, nextShipmentNumber } from '../../utils/sequencer';
import { receiveStock } from '../inventory/inventory.service';

interface SupplierData {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
}

export async function listSuppliers(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const search = query.search ? `%${query.search}%` : null;

  let where = 'WHERE deleted_at IS NULL';
  const params: (string | number | null)[] = [];
  let idx = 1;

  if (search) {
    where += ` AND (name ILIKE $${idx} OR email ILIKE $${idx + 1})`;
    params.push(search, search);
    idx += 2;
  }

  const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM suppliers ${where}`, params);
  const total = parseInt(countResult.rows[0].cnt, 10);

  const { rows } = await pool.query(
    `SELECT * FROM suppliers ${where} ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { rows, meta: paginationMeta(total, page, limit) };
}

export async function getSupplierById(id: number) {
  const { rows } = await pool.query(
    'SELECT * FROM suppliers WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return rows[0] || null;
}

export async function createSupplier(data: SupplierData) {
  const { rows } = await pool.query(
    `INSERT INTO suppliers (name, contact_name, email, phone, address, payment_terms, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [data.name, data.contact_name ?? null, data.email ?? null, data.phone ?? null,
     data.address ?? null, data.payment_terms ?? null, data.notes ?? null]
  );
  return getSupplierById(rows[0].id);
}

export async function updateSupplier(id: number, data: SupplierData) {
  await pool.query(
    `UPDATE suppliers SET name=$1, contact_name=$2, email=$3, phone=$4,
     address=$5, payment_terms=$6, notes=$7, updated_at=$8 WHERE id = $9`,
    [data.name, data.contact_name ?? null, data.email ?? null, data.phone ?? null,
     data.address ?? null, data.payment_terms ?? null, data.notes ?? null, Date.now(), id]
  );
  return getSupplierById(id);
}

export async function deleteSupplier(id: number) {
  const now = Date.now();
  await pool.query('UPDATE suppliers SET deleted_at = $1, updated_at = $1 WHERE id = $2', [now, id]);
}

export async function getSupplierProducts(supplierId: number) {
  const { rows } = await pool.query(
    `SELECT sp.*, p.name as product_name, p.sku
     FROM supplier_products sp JOIN products p ON p.id = sp.product_id
     WHERE sp.supplier_id = $1`,
    [supplierId]
  );
  return rows;
}

export async function addSupplierProduct(supplierId: number, data: {
  product_id: number; supplier_sku?: string | null; cost_price_cents: number;
  lead_time_days: number; min_order_quantity: number; is_preferred: boolean;
}) {
  await pool.query(
    `INSERT INTO supplier_products
     (supplier_id, product_id, supplier_sku, cost_price_cents, lead_time_days, min_order_quantity, is_preferred)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (supplier_id, product_id) DO UPDATE SET
       supplier_sku = EXCLUDED.supplier_sku,
       cost_price_cents = EXCLUDED.cost_price_cents,
       lead_time_days = EXCLUDED.lead_time_days,
       min_order_quantity = EXCLUDED.min_order_quantity,
       is_preferred = EXCLUDED.is_preferred`,
    [supplierId, data.product_id, data.supplier_sku ?? null, data.cost_price_cents,
     data.lead_time_days, data.min_order_quantity, data.is_preferred]
  );
  return getSupplierProducts(supplierId);
}

export async function removeSupplierProduct(supplierId: number, productId: number) {
  await pool.query(
    'DELETE FROM supplier_products WHERE supplier_id = $1 AND product_id = $2',
    [supplierId, productId]
  );
}

interface PoItem {
  product_id: number;
  quantity_ordered: number;
  unit_cost_cents: number;
}

export async function listPurchaseOrders(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];
  let idx = 1;

  if (query.status) { where += ` AND po.status = $${idx}`; params.push(query.status); idx++; }
  if (query.supplier_id) { where += ` AND po.supplier_id = $${idx}`; params.push(Number(query.supplier_id)); idx++; }

  const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM purchase_orders po ${where}`, params);
  const total = parseInt(countResult.rows[0].cnt, 10);

  const { rows } = await pool.query(
    `SELECT po.*, s.name as supplier_name,
            (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as item_count
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     ${where} ORDER BY po.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { rows, meta: paginationMeta(total, page, limit) };
}

export async function getPurchaseOrderById(id: number) {
  const { rows: poRows } = await pool.query(
    `SELECT po.*, s.name as supplier_name, s.email as supplier_email
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = $1`,
    [id]
  );
  if (!poRows[0]) return null;

  const { rows: items } = await pool.query(
    `SELECT poi.*, p.name as product_name, p.sku
     FROM purchase_order_items poi JOIN products p ON p.id = poi.product_id
     WHERE poi.purchase_order_id = $1`,
    [id]
  );

  return { ...poRows[0], items };
}

export async function createPurchaseOrder(data: { supplier_id: number; expected_date?: number | null; notes?: string | null; items: PoItem[] }, userId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const poNumber = await nextPoNumber();
    const itemsWithTotals = data.items.map((i) => ({ ...i, line_total_cents: i.quantity_ordered * i.unit_cost_cents }));
    const subtotal = itemsWithTotals.reduce((s, i) => s + i.line_total_cents, 0);

    const { rows } = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, created_by, expected_date, notes, subtotal_cents, total_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [poNumber, data.supplier_id, userId, data.expected_date ?? null, data.notes ?? null, subtotal, subtotal]
    );
    const poId = rows[0].id;

    for (const item of itemsWithTotals) {
      await client.query(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost_cents, line_total_cents)
         VALUES ($1, $2, $3, $4, $5)`,
        [poId, item.product_id, item.quantity_ordered, item.unit_cost_cents, item.line_total_cents]
      );
    }

    await client.query('COMMIT');
    return getPurchaseOrderById(poId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updatePoStatus(poId: number, status: string) {
  await pool.query(
    'UPDATE purchase_orders SET status = $1, updated_at = $2 WHERE id = $3',
    [status, Date.now(), poId]
  );
  return getPurchaseOrderById(poId);
}

export async function receivePurchaseOrder(poId: number, items: { id: number; quantity_received: number }[], userId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      const { rows: poItemRows } = await client.query(
        'SELECT * FROM purchase_order_items WHERE id = $1 AND purchase_order_id = $2',
        [item.id, poId]
      );
      const poItem = poItemRows[0];
      if (!poItem) throw new Error(`PO item ${item.id} not found`);

      const newReceived = Number(poItem.quantity_received) + item.quantity_received;
      await client.query(
        'UPDATE purchase_order_items SET quantity_received = $1 WHERE id = $2',
        [newReceived, item.id]
      );

      if (item.quantity_received > 0) {
        await receiveStock(client, poItem.product_id, item.quantity_received, poId, userId);
      }
    }

    const { rows: allItems } = await client.query(
      'SELECT quantity_ordered, quantity_received FROM purchase_order_items WHERE purchase_order_id = $1',
      [poId]
    );

    const allReceived = allItems.every((i: { quantity_ordered: string; quantity_received: string }) =>
      Number(i.quantity_received) >= Number(i.quantity_ordered)
    );
    const anyReceived = allItems.some((i: { quantity_received: string }) => Number(i.quantity_received) > 0);

    const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'confirmed';
    const now = Date.now();

    if (allReceived) {
      await client.query(
        'UPDATE purchase_orders SET status = $1, received_at = $2, updated_at = $2 WHERE id = $3',
        [newStatus, now, poId]
      );
    } else {
      await client.query(
        'UPDATE purchase_orders SET status = $1, updated_at = $2 WHERE id = $3',
        [newStatus, now, poId]
      );
    }

    await client.query('COMMIT');
    return getPurchaseOrderById(poId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listShipments(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];
  let idx = 1;

  if (query.status) { where += ` AND s.status = $${idx}`; params.push(query.status); idx++; }
  if (query.order_id) { where += ` AND s.order_id = $${idx}`; params.push(Number(query.order_id)); idx++; }

  const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM shipments s ${where}`, params);
  const total = parseInt(countResult.rows[0].cnt, 10);

  const { rows } = await pool.query(
    `SELECT s.*, o.order_number, c.name as customer_name
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     JOIN customers c ON c.id = o.customer_id
     ${where} ORDER BY s.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { rows, meta: paginationMeta(total, page, limit) };
}

export async function getShipmentById(id: number) {
  const { rows } = await pool.query(
    `SELECT s.*, o.order_number, c.name as customer_name
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     JOIN customers c ON c.id = o.customer_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createShipment(data: { order_id: number; carrier?: string | null; tracking_number?: string | null; estimated_delivery?: number | null; notes?: string | null }) {
  const shipmentNumber = await nextShipmentNumber();
  const { rows } = await pool.query(
    `INSERT INTO shipments (shipment_number, order_id, carrier, tracking_number, estimated_delivery, notes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [shipmentNumber, data.order_id, data.carrier ?? null, data.tracking_number ?? null,
     data.estimated_delivery ?? null, data.notes ?? null]
  );
  return getShipmentById(rows[0].id);
}

export async function updateShipmentStatus(id: number, data: { status: string; carrier?: string | null; tracking_number?: string | null; actual_delivery?: number | null }) {
  const now = Date.now();
  const setClauses: string[] = ['status = $1', 'updated_at = $2'];
  const params: (string | number | null)[] = [data.status, now];
  let idx = 3;

  if (data.carrier !== undefined) { setClauses.push(`carrier = $${idx}`); params.push(data.carrier); idx++; }
  if (data.tracking_number !== undefined) { setClauses.push(`tracking_number = $${idx}`); params.push(data.tracking_number); idx++; }
  if (data.status === 'dispatched' || data.status === 'in_transit') {
    setClauses.push(`shipped_at = $${idx}`); params.push(now); idx++;
  }
  if (data.status === 'delivered') {
    setClauses.push(`actual_delivery = $${idx}`); params.push(data.actual_delivery ?? now); idx++;
  }

  params.push(id);
  await pool.query(`UPDATE shipments SET ${setClauses.join(', ')} WHERE id = $${idx}`, params);

  if (data.status === 'delivered') {
    const { rows } = await pool.query('SELECT order_id FROM shipments WHERE id = $1', [id]);
    await pool.query(
      "UPDATE orders SET status = 'delivered', delivered_at = $1, updated_at = $1 WHERE id = $2",
      [now, rows[0].order_id]
    );
  }

  return getShipmentById(id);
}
