import pool from '../../config/database';
import { parsePagination, paginationMeta } from '../../utils/pagination';

interface CustomerData {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  notes?: string | null;
}

export async function listCustomers(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const search = query.search ? `%${query.search}%` : null;

  let where = 'WHERE deleted_at IS NULL';
  const params: (string | number | null)[] = [];
  let paramIdx = 1;

  if (search) {
    where += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx + 1} OR company ILIKE $${paramIdx + 2})`;
    params.push(search, search, search);
    paramIdx += 3;
  }

  const countResult = await pool.query(`SELECT COUNT(*) as cnt FROM customers ${where}`, params);
  const total = parseInt(countResult.rows[0].cnt, 10);

  const rows = await pool.query(
    `SELECT * FROM customers ${where} ORDER BY name ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  return { rows: rows.rows, meta: paginationMeta(total, page, limit) };
}

export async function getCustomerById(id: number) {
  const { rows } = await pool.query(
    'SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return rows[0] || null;
}

export async function createCustomer(data: CustomerData) {
  const { rows } = await pool.query(
    `INSERT INTO customers (name, email, phone, company, billing_address, shipping_address, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [data.name, data.email ?? null, data.phone ?? null, data.company ?? null,
     data.billing_address ?? null, data.shipping_address ?? null, data.notes ?? null]
  );
  return getCustomerById(rows[0].id);
}

export async function updateCustomer(id: number, data: CustomerData) {
  await pool.query(
    `UPDATE customers SET name=$1, email=$2, phone=$3, company=$4,
     billing_address=$5, shipping_address=$6, notes=$7, updated_at=$8
     WHERE id = $9`,
    [data.name, data.email ?? null, data.phone ?? null, data.company ?? null,
     data.billing_address ?? null, data.shipping_address ?? null, data.notes ?? null,
     Date.now(), id]
  );
  return getCustomerById(id);
}

export async function deleteCustomer(id: number) {
  const now = Date.now();
  await pool.query('UPDATE customers SET deleted_at = $1, updated_at = $1 WHERE id = $2', [now, id]);
}

export async function getCustomerOrders(customerId: number) {
  const { rows } = await pool.query(
    `SELECT o.*, c.name as customer_name FROM orders o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.customer_id = $1 ORDER BY o.created_at DESC`,
    [customerId]
  );
  return rows;
}

export async function getCustomerInvoices(customerId: number) {
  const { rows } = await pool.query(
    `SELECT i.*, c.name as customer_name FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     WHERE i.customer_id = $1 ORDER BY i.created_at DESC`,
    [customerId]
  );
  return rows;
}
