import db from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';
import { nextPoNumber, nextShipmentNumber } from '../../utils/sequencer';
import { receiveStock } from '../inventory/inventory.service';

// ── Suppliers ─────────────────────────────────────────────────────────────────

interface SupplierData {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
}

export function listSuppliers(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const search = query.search ? `%${query.search}%` : null;

  let where = 'WHERE deleted_at IS NULL';
  const params: (string | number | null)[] = [];
  if (search) { where += ' AND (name LIKE ? OR email LIKE ?)'; params.push(search, search); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM suppliers ${where}`).get(...params) as { cnt: number }).cnt;
  const rows = db.prepare(`SELECT * FROM suppliers ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows, meta: paginationMeta(total, page, limit) };
}

export function getSupplierById(id: number) {
  return db.prepare('SELECT * FROM suppliers WHERE id = ? AND deleted_at IS NULL').get(id);
}

export function createSupplier(data: SupplierData) {
  const result = db.prepare(
    `INSERT INTO suppliers (name, contact_name, email, phone, address, payment_terms, notes)
     VALUES (@name, @contact_name, @email, @phone, @address, @payment_terms, @notes)`
  ).run(data) as { lastInsertRowid: number };
  return getSupplierById(result.lastInsertRowid);
}

export function updateSupplier(id: number, data: SupplierData) {
  db.prepare(
    `UPDATE suppliers SET name=@name, contact_name=@contact_name, email=@email, phone=@phone,
     address=@address, payment_terms=@payment_terms, notes=@notes, updated_at=@updated_at WHERE id = @id`
  ).run({ ...data, updated_at: Date.now(), id });
  return getSupplierById(id);
}

export function deleteSupplier(id: number) {
  db.prepare('UPDATE suppliers SET deleted_at = ?, updated_at = ? WHERE id = ?').run(Date.now(), Date.now(), id);
}

export function getSupplierProducts(supplierId: number) {
  return db.prepare(
    `SELECT sp.*, p.name as product_name, p.sku
     FROM supplier_products sp JOIN products p ON p.id = sp.product_id
     WHERE sp.supplier_id = ?`
  ).all(supplierId);
}

export function addSupplierProduct(supplierId: number, data: {
  product_id: number; supplier_sku?: string | null; cost_price_cents: number;
  lead_time_days: number; min_order_quantity: number; is_preferred: boolean;
}) {
  db.prepare(
    `INSERT OR REPLACE INTO supplier_products
     (supplier_id, product_id, supplier_sku, cost_price_cents, lead_time_days, min_order_quantity, is_preferred)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(supplierId, data.product_id, data.supplier_sku ?? null, data.cost_price_cents,
    data.lead_time_days, data.min_order_quantity, data.is_preferred ? 1 : 0);
  return getSupplierProducts(supplierId);
}

export function removeSupplierProduct(supplierId: number, productId: number) {
  db.prepare('DELETE FROM supplier_products WHERE supplier_id = ? AND product_id = ?').run(supplierId, productId);
}

// ── Purchase Orders ────────────────────────────────────────────────────────────

interface PoItem {
  product_id: number;
  quantity_ordered: number;
  unit_cost_cents: number;
}

export function listPurchaseOrders(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];
  if (query.status) { where += ' AND po.status = ?'; params.push(query.status); }
  if (query.supplier_id) { where += ' AND po.supplier_id = ?'; params.push(Number(query.supplier_id)); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM purchase_orders po ${where}`).get(...params) as { cnt: number }).cnt;
  const rows = db.prepare(
    `SELECT po.*, s.name as supplier_name,
            (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id) as item_count
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     ${where} ORDER BY po.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  return { rows, meta: paginationMeta(total, page, limit) };
}

export function getPurchaseOrderById(id: number) {
  const po = db.prepare(
    `SELECT po.*, s.name as supplier_name, s.email as supplier_email
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.id = ?`
  ).get(id);
  if (!po) return null;

  const items = db.prepare(
    `SELECT poi.*, p.name as product_name, p.sku
     FROM purchase_order_items poi JOIN products p ON p.id = poi.product_id
     WHERE poi.purchase_order_id = ?`
  ).all(id);

  return { ...(po as object), items };
}

export function createPurchaseOrder(data: { supplier_id: number; expected_date?: number | null; notes?: string | null; items: PoItem[] }, userId: number) {
  return db.transaction(() => {
    const poNumber = nextPoNumber();
    const itemsWithTotals = data.items.map((i) => ({ ...i, line_total_cents: i.quantity_ordered * i.unit_cost_cents }));
    const subtotal = itemsWithTotals.reduce((s, i) => s + i.line_total_cents, 0);

    const result = db.prepare(
      `INSERT INTO purchase_orders (po_number, supplier_id, created_by, expected_date, notes, subtotal_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(poNumber, data.supplier_id, userId, data.expected_date ?? null, data.notes ?? null, subtotal, subtotal) as { lastInsertRowid: number };

    const poId = result.lastInsertRowid;
    for (const item of itemsWithTotals) {
      db.prepare(
        `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost_cents, line_total_cents)
         VALUES (?, ?, ?, ?, ?)`
      ).run(poId, item.product_id, item.quantity_ordered, item.unit_cost_cents, item.line_total_cents);
    }

    return getPurchaseOrderById(poId);
  })();
}

export function updatePoStatus(poId: number, status: string) {
  const now = Date.now();
  db.prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now, poId);
  return getPurchaseOrderById(poId);
}

export function receivePurchaseOrder(poId: number, items: { id: number; quantity_received: number }[], userId: number) {
  return db.transaction(() => {
    for (const item of items) {
      const poItem = db.prepare(
        'SELECT * FROM purchase_order_items WHERE id = ? AND purchase_order_id = ?'
      ).get(item.id, poId) as { product_id: number; quantity_ordered: number; quantity_received: number } | undefined;

      if (!poItem) throw new Error(`PO item ${item.id} not found`);

      const newReceived = poItem.quantity_received + item.quantity_received;
      db.prepare('UPDATE purchase_order_items SET quantity_received = ? WHERE id = ?').run(newReceived, item.id);

      if (item.quantity_received > 0) {
        receiveStock(poItem.product_id, item.quantity_received, poId, userId);
      }
    }

    // Update PO status
    const allItems = db.prepare(
      'SELECT quantity_ordered, quantity_received FROM purchase_order_items WHERE purchase_order_id = ?'
    ).all(poId) as { quantity_ordered: number; quantity_received: number }[];

    const allReceived = allItems.every((i) => i.quantity_received >= i.quantity_ordered);
    const anyReceived = allItems.some((i) => i.quantity_received > 0);

    const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'confirmed';
    const updates: (string | number | null)[] = [newStatus, Date.now()];
    let sql = 'UPDATE purchase_orders SET status = ?, updated_at = ?';
    if (allReceived) { sql += ', received_at = ?'; updates.push(Date.now()); }
    sql += ' WHERE id = ?';
    updates.push(poId);
    db.prepare(sql).run(...updates);

    return getPurchaseOrderById(poId);
  })();
}

// ── Shipments ─────────────────────────────────────────────────────────────────

export function listShipments(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  let where = 'WHERE 1=1';
  const params: (string | number)[] = [];
  if (query.status) { where += ' AND s.status = ?'; params.push(query.status); }
  if (query.order_id) { where += ' AND s.order_id = ?'; params.push(Number(query.order_id)); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM shipments s ${where}`).get(...params) as { cnt: number }).cnt;
  const rows = db.prepare(
    `SELECT s.*, o.order_number, c.name as customer_name
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     JOIN customers c ON c.id = o.customer_id
     ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);
  return { rows, meta: paginationMeta(total, page, limit) };
}

export function getShipmentById(id: number) {
  return db.prepare(
    `SELECT s.*, o.order_number, c.name as customer_name
     FROM shipments s
     JOIN orders o ON o.id = s.order_id
     JOIN customers c ON c.id = o.customer_id
     WHERE s.id = ?`
  ).get(id);
}

export function createShipment(data: { order_id: number; carrier?: string | null; tracking_number?: string | null; estimated_delivery?: number | null; notes?: string | null }) {
  const shipmentNumber = nextShipmentNumber();
  const result = db.prepare(
    `INSERT INTO shipments (shipment_number, order_id, carrier, tracking_number, estimated_delivery, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(shipmentNumber, data.order_id, data.carrier ?? null, data.tracking_number ?? null, data.estimated_delivery ?? null, data.notes ?? null) as { lastInsertRowid: number };
  return getShipmentById(result.lastInsertRowid);
}

export function updateShipmentStatus(id: number, data: { status: string; carrier?: string | null; tracking_number?: string | null; actual_delivery?: number | null }) {
  const now = Date.now();
  const updates: Record<string, string | number | null> = { status: data.status, updated_at: now };
  if (data.carrier !== undefined) updates.carrier = data.carrier;
  if (data.tracking_number !== undefined) updates.tracking_number = data.tracking_number;
  if (data.status === 'dispatched' || data.status === 'in_transit') updates.shipped_at = now;
  if (data.status === 'delivered') updates.actual_delivery = data.actual_delivery ?? now;

  const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE shipments SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), id);

  // Update parent order status if delivered
  if (data.status === 'delivered') {
    const shipment = db.prepare('SELECT order_id FROM shipments WHERE id = ?').get(id) as { order_id: number };
    db.prepare("UPDATE orders SET status = 'delivered', delivered_at = ?, updated_at = ? WHERE id = ?")
      .run(now, now, shipment.order_id);
  }

  return getShipmentById(id);
}
