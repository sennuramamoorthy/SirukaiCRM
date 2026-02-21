import db from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';

// ── Products ─────────────────────────────────────────────────────────────────

interface ProductData {
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  unit_price_cents: number;
  cost_price_cents: number;
  unit: string;
  reorder_point?: number;
  reorder_quantity?: number;
  location?: string | null;
}

export function listProducts(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const search = query.search ? `%${query.search}%` : null;
  const category = query.category || null;

  let where = 'WHERE p.deleted_at IS NULL';
  const params: (string | number | null)[] = [];

  if (search) {
    where += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(search, search);
  }
  if (category) {
    where += ' AND p.category = ?';
    params.push(category);
  }

  const total = (db.prepare(
    `SELECT COUNT(*) as cnt FROM products p ${where}`
  ).get(...params) as { cnt: number }).cnt;

  const rows = db.prepare(
    `SELECT p.*, i.quantity_on_hand, i.quantity_reserved,
            (i.quantity_on_hand - i.quantity_reserved) AS quantity_available,
            i.reorder_point, i.reorder_quantity, i.location
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { rows, meta: paginationMeta(total, page, limit) };
}

export function getProductById(id: number) {
  return db.prepare(
    `SELECT p.*, i.quantity_on_hand, i.quantity_reserved,
            (i.quantity_on_hand - i.quantity_reserved) AS quantity_available,
            i.reorder_point, i.reorder_quantity, i.location
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.id = ? AND p.deleted_at IS NULL`
  ).get(id);
}

export function createProduct(data: ProductData) {
  const result = db.prepare(
    `INSERT INTO products (sku, name, description, category, unit_price_cents, cost_price_cents, unit)
     VALUES (@sku, @name, @description, @category, @unit_price_cents, @cost_price_cents, @unit)`
  ).run(data) as { lastInsertRowid: number };

  const productId = result.lastInsertRowid;
  db.prepare(
    `INSERT INTO inventory (product_id, quantity_on_hand, reorder_point, reorder_quantity, location)
     VALUES (?, ?, ?, ?, ?)`
  ).run(productId, 0, data.reorder_point ?? 0, data.reorder_quantity ?? 0, data.location ?? null);

  return getProductById(productId);
}

export function updateProduct(id: number, data: ProductData) {
  const now = Date.now();
  db.prepare(
    `UPDATE products SET sku=@sku, name=@name, description=@description, category=@category,
     unit_price_cents=@unit_price_cents, cost_price_cents=@cost_price_cents,
     unit=@unit, updated_at=@updated_at WHERE id = @id`
  ).run({ ...data, updated_at: now, id });

  db.prepare(
    `UPDATE inventory SET reorder_point=@reorder_point, reorder_quantity=@reorder_quantity,
     location=@location, updated_at=@updated_at WHERE product_id = @id`
  ).run({ reorder_point: data.reorder_point ?? 0, reorder_quantity: data.reorder_quantity ?? 0, location: data.location ?? null, updated_at: now, id });

  return getProductById(id);
}

export function deleteProduct(id: number) {
  db.prepare('UPDATE products SET deleted_at = ?, updated_at = ? WHERE id = ?').run(Date.now(), Date.now(), id);
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export function getLowStockProducts() {
  return db.prepare(
    `SELECT p.*, i.quantity_on_hand, i.quantity_reserved,
            (i.quantity_on_hand - i.quantity_reserved) AS quantity_available,
            i.reorder_point, i.reorder_quantity
     FROM products p
     JOIN inventory i ON i.product_id = p.id
     WHERE p.deleted_at IS NULL AND i.quantity_on_hand <= i.reorder_point
     ORDER BY (i.quantity_on_hand - i.reorder_point) ASC`
  ).all();
}

export function adjustStock(
  productId: number,
  data: { transaction_type: string; quantity_change: number; notes?: string | null },
  createdBy: number
) {
  return db.transaction(() => {
    const inv = db.prepare(
      'SELECT quantity_on_hand, quantity_reserved FROM inventory WHERE product_id = ?'
    ).get(productId) as { quantity_on_hand: number; quantity_reserved: number } | undefined;

    if (!inv) throw new Error('Product inventory not found');

    const newQty = inv.quantity_on_hand + data.quantity_change;
    if (newQty < 0) throw new Error('Insufficient stock for adjustment');

    db.prepare('UPDATE inventory SET quantity_on_hand = ?, updated_at = ? WHERE product_id = ?')
      .run(newQty, Date.now(), productId);

    db.prepare(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, notes, created_by)
       VALUES (?, ?, ?, ?, ?)`
    ).run(productId, data.transaction_type, data.quantity_change, data.notes ?? null, createdBy);

    return getProductById(productId);
  })();
}

export function getStockTransactions(productId: number) {
  return db.prepare(
    `SELECT t.*, u.name as created_by_name FROM inventory_transactions t
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.product_id = ? ORDER BY t.created_at DESC`
  ).all(productId);
}

// Called by orders service
export function reserveStock(productId: number, qty: number, orderId: number, userId: number) {
  return db.transaction(() => {
    const inv = db.prepare(
      'SELECT quantity_on_hand, quantity_reserved FROM inventory WHERE product_id = ?'
    ).get(productId) as { quantity_on_hand: number; quantity_reserved: number };

    db.prepare('UPDATE inventory SET quantity_reserved = ?, updated_at = ? WHERE product_id = ?')
      .run(inv.quantity_reserved + qty, Date.now(), productId);

    db.prepare(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
       VALUES (?, 'adjustment', ?, 'order', ?, 'Reserved for order', ?)`
    ).run(productId, -qty, orderId, userId);
  })();
}

export function releaseReservation(productId: number, qty: number, orderId: number, userId: number) {
  return db.transaction(() => {
    const inv = db.prepare(
      'SELECT quantity_reserved FROM inventory WHERE product_id = ?'
    ).get(productId) as { quantity_reserved: number };

    const newReserved = Math.max(0, inv.quantity_reserved - qty);
    db.prepare('UPDATE inventory SET quantity_reserved = ?, updated_at = ? WHERE product_id = ?')
      .run(newReserved, Date.now(), productId);

    db.prepare(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
       VALUES (?, 'adjustment', ?, 'order', ?, 'Reservation released (order cancelled)', ?)`
    ).run(productId, qty, orderId, userId);
  })();
}

export function deductStock(productId: number, qty: number, orderId: number, userId: number) {
  return db.transaction(() => {
    const inv = db.prepare(
      'SELECT quantity_on_hand, quantity_reserved FROM inventory WHERE product_id = ?'
    ).get(productId) as { quantity_on_hand: number; quantity_reserved: number };

    db.prepare(
      'UPDATE inventory SET quantity_on_hand = ?, quantity_reserved = ?, updated_at = ? WHERE product_id = ?'
    ).run(
      inv.quantity_on_hand - qty,
      Math.max(0, inv.quantity_reserved - qty),
      Date.now(),
      productId
    );

    db.prepare(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
       VALUES (?, 'sale', ?, 'order', ?, 'Sold / shipped', ?)`
    ).run(productId, -qty, orderId, userId);
  })();
}

export function receiveStock(productId: number, qty: number, poId: number, userId: number) {
  return db.transaction(() => {
    const inv = db.prepare(
      'SELECT quantity_on_hand FROM inventory WHERE product_id = ?'
    ).get(productId) as { quantity_on_hand: number };

    db.prepare('UPDATE inventory SET quantity_on_hand = ?, updated_at = ? WHERE product_id = ?')
      .run(inv.quantity_on_hand + qty, Date.now(), productId);

    db.prepare(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
       VALUES (?, 'purchase_receipt', ?, 'purchase_order', ?, 'Received from PO', ?)`
    ).run(productId, qty, poId, userId);
  })();
}

export function getCategories() {
  return db.prepare(
    'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND deleted_at IS NULL ORDER BY category'
  ).all();
}
