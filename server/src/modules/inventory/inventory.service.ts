import pool from '../../config/database';
import { PoolClient } from 'pg';
import { parsePagination, paginationMeta } from '../../utils/pagination';

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

export async function listProducts(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const search = query.search ? `%${query.search}%` : null;
  const category = query.category || null;

  let where = 'WHERE p.deleted_at IS NULL';
  const params: (string | number | null)[] = [];
  let idx = 1;

  if (search) {
    where += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx + 1})`;
    params.push(search, search);
    idx += 2;
  }
  if (category) {
    where += ` AND p.category = $${idx}`;
    params.push(category);
    idx++;
  }

  const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM products p ${where}`, params);
  const total = parseInt(countResult.rows[0].cnt, 10);

  const { rows } = await pool.query(
    `SELECT p.*, i.quantity_on_hand, i.quantity_reserved,
            (i.quantity_on_hand - i.quantity_reserved) AS quantity_available,
            i.reorder_point, i.reorder_quantity, i.location
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     ${where} ORDER BY p.name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return { rows, meta: paginationMeta(total, page, limit) };
}

export async function getProductById(id: number) {
  const { rows } = await pool.query(
    `SELECT p.*, i.quantity_on_hand, i.quantity_reserved,
            (i.quantity_on_hand - i.quantity_reserved) AS quantity_available,
            i.reorder_point, i.reorder_quantity, i.location
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

export async function createProduct(data: ProductData) {
  const { rows } = await pool.query(
    `INSERT INTO products (sku, name, description, category, unit_price_cents, cost_price_cents, unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [data.sku, data.name, data.description ?? null, data.category ?? null,
     data.unit_price_cents, data.cost_price_cents, data.unit]
  );
  const productId = rows[0].id;
  await pool.query(
    `INSERT INTO inventory (product_id, quantity_on_hand, reorder_point, reorder_quantity, location)
     VALUES ($1, $2, $3, $4, $5)`,
    [productId, 0, data.reorder_point ?? 0, data.reorder_quantity ?? 0, data.location ?? null]
  );
  return getProductById(productId);
}

export async function updateProduct(id: number, data: ProductData) {
  const now = Date.now();
  await pool.query(
    `UPDATE products SET sku=$1, name=$2, description=$3, category=$4,
     unit_price_cents=$5, cost_price_cents=$6, unit=$7, updated_at=$8 WHERE id = $9`,
    [data.sku, data.name, data.description ?? null, data.category ?? null,
     data.unit_price_cents, data.cost_price_cents, data.unit, now, id]
  );
  await pool.query(
    `UPDATE inventory SET reorder_point=$1, reorder_quantity=$2, location=$3, updated_at=$4
     WHERE product_id = $5`,
    [data.reorder_point ?? 0, data.reorder_quantity ?? 0, data.location ?? null, now, id]
  );
  return getProductById(id);
}

export async function deleteProduct(id: number) {
  const now = Date.now();
  await pool.query('UPDATE products SET deleted_at = $1, updated_at = $1 WHERE id = $2', [now, id]);
}

export async function getLowStockProducts() {
  const { rows } = await pool.query(
    `SELECT p.*, i.quantity_on_hand, i.quantity_reserved,
            (i.quantity_on_hand - i.quantity_reserved) AS quantity_available,
            i.reorder_point, i.reorder_quantity
     FROM products p
     JOIN inventory i ON i.product_id = p.id
     WHERE p.deleted_at IS NULL AND i.quantity_on_hand <= i.reorder_point
     ORDER BY (i.quantity_on_hand - i.reorder_point) ASC`
  );
  return rows;
}

export async function adjustStock(
  productId: number,
  data: { transaction_type: string; quantity_change: number; notes?: string | null },
  createdBy: number
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: invRows } = await client.query(
      'SELECT quantity_on_hand, quantity_reserved FROM inventory WHERE product_id = $1',
      [productId]
    );
    if (!invRows[0]) throw new Error('Product inventory not found');

    const inv = invRows[0];
    const newQty = Number(inv.quantity_on_hand) + data.quantity_change;
    if (newQty < 0) throw new Error('Insufficient stock for adjustment');

    await client.query(
      'UPDATE inventory SET quantity_on_hand = $1, updated_at = $2 WHERE product_id = $3',
      [newQty, Date.now(), productId]
    );
    await client.query(
      `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, data.transaction_type, data.quantity_change, data.notes ?? null, createdBy]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getProductById(productId);
}

export async function getStockTransactions(productId: number) {
  const { rows } = await pool.query(
    `SELECT t.*, u.name as created_by_name FROM inventory_transactions t
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.product_id = $1 ORDER BY t.created_at DESC`,
    [productId]
  );
  return rows;
}

// Called by orders service — requires an existing client for transaction participation
export async function reserveStock(client: PoolClient, productId: number, qty: number, orderId: number, userId: number) {
  const { rows: invRows } = await client.query(
    'SELECT quantity_reserved FROM inventory WHERE product_id = $1',
    [productId]
  );
  await client.query(
    'UPDATE inventory SET quantity_reserved = $1, updated_at = $2 WHERE product_id = $3',
    [Number(invRows[0].quantity_reserved) + qty, Date.now(), productId]
  );
  await client.query(
    `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
     VALUES ($1, 'adjustment', $2, 'order', $3, 'Reserved for order', $4)`,
    [productId, -qty, orderId, userId]
  );
}

export async function releaseReservation(client: PoolClient, productId: number, qty: number, orderId: number, userId: number) {
  const { rows: invRows } = await client.query(
    'SELECT quantity_reserved FROM inventory WHERE product_id = $1',
    [productId]
  );
  const newReserved = Math.max(0, Number(invRows[0].quantity_reserved) - qty);
  await client.query(
    'UPDATE inventory SET quantity_reserved = $1, updated_at = $2 WHERE product_id = $3',
    [newReserved, Date.now(), productId]
  );
  await client.query(
    `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
     VALUES ($1, 'adjustment', $2, 'order', $3, 'Reservation released (order cancelled)', $4)`,
    [productId, qty, orderId, userId]
  );
}

export async function deductStock(client: PoolClient, productId: number, qty: number, orderId: number, userId: number) {
  const { rows: invRows } = await client.query(
    'SELECT quantity_on_hand, quantity_reserved FROM inventory WHERE product_id = $1',
    [productId]
  );
  const inv = invRows[0];
  await client.query(
    'UPDATE inventory SET quantity_on_hand = $1, quantity_reserved = $2, updated_at = $3 WHERE product_id = $4',
    [
      Number(inv.quantity_on_hand) - qty,
      Math.max(0, Number(inv.quantity_reserved) - qty),
      Date.now(),
      productId,
    ]
  );
  await client.query(
    `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
     VALUES ($1, 'sale', $2, 'order', $3, 'Sold / shipped', $4)`,
    [productId, -qty, orderId, userId]
  );
}

export async function receiveStock(client: PoolClient, productId: number, qty: number, poId: number, userId: number) {
  const { rows: invRows } = await client.query(
    'SELECT quantity_on_hand FROM inventory WHERE product_id = $1',
    [productId]
  );
  await client.query(
    'UPDATE inventory SET quantity_on_hand = $1, updated_at = $2 WHERE product_id = $3',
    [Number(invRows[0].quantity_on_hand) + qty, Date.now(), productId]
  );
  await client.query(
    `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, reference_type, reference_id, notes, created_by)
     VALUES ($1, 'purchase_receipt', $2, 'purchase_order', $3, 'Received from PO', $4)`,
    [productId, qty, poId, userId]
  );
}

export async function getCategories() {
  const { rows } = await pool.query(
    'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND deleted_at IS NULL ORDER BY category'
  );
  return rows;
}
