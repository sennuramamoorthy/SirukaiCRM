import db from '../../config/database';
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

export function listCustomers(query: Record<string, string | undefined>) {
  const { page, limit, offset } = parsePagination(query);
  const search = query.search ? `%${query.search}%` : null;

  let where = 'WHERE deleted_at IS NULL';
  const params: (string | number | null)[] = [];

  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
    params.push(search, search, search);
  }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM customers ${where}`).get(...params) as { cnt: number }).cnt;
  const rows = db.prepare(`SELECT * FROM customers ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return { rows, meta: paginationMeta(total, page, limit) };
}

export function getCustomerById(id: number) {
  return db.prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL').get(id);
}

export function createCustomer(data: CustomerData) {
  const result = db.prepare(
    `INSERT INTO customers (name, email, phone, company, billing_address, shipping_address, notes)
     VALUES (@name, @email, @phone, @company, @billing_address, @shipping_address, @notes)`
  ).run(data) as { lastInsertRowid: number };
  return getCustomerById(result.lastInsertRowid);
}

export function updateCustomer(id: number, data: CustomerData) {
  db.prepare(
    `UPDATE customers SET name=@name, email=@email, phone=@phone, company=@company,
     billing_address=@billing_address, shipping_address=@shipping_address,
     notes=@notes, updated_at=@updated_at WHERE id = @id`
  ).run({ ...data, updated_at: Date.now(), id });
  return getCustomerById(id);
}

export function deleteCustomer(id: number) {
  db.prepare('UPDATE customers SET deleted_at = ?, updated_at = ? WHERE id = ?').run(Date.now(), Date.now(), id);
}

export function getCustomerOrders(customerId: number) {
  return db.prepare(
    `SELECT o.*, c.name as customer_name FROM orders o
     JOIN customers c ON c.id = o.customer_id
     WHERE o.customer_id = ? ORDER BY o.created_at DESC`
  ).all(customerId);
}

export function getCustomerInvoices(customerId: number) {
  return db.prepare(
    `SELECT i.*, c.name as customer_name FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     WHERE i.customer_id = ? ORDER BY i.created_at DESC`
  ).all(customerId);
}
