import db from '../../config/database';

function defaultDates(query: Record<string, string | undefined>) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const from = query.from ? Number(query.from) : thirtyDaysAgo;
  const to = query.to ? Number(query.to) : now;
  return { from, to };
}

export function getSalesReport(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);
  const groupBy = query.group_by === 'week' ? '%Y-W%W' : query.group_by === 'month' ? '%Y-%m' : '%Y-%m-%d';

  const rows = db.prepare(
    `SELECT
       strftime('${groupBy}', datetime(created_at / 1000, 'unixepoch')) as period,
       COUNT(*) as order_count,
       SUM(total_cents) as revenue_cents,
       AVG(total_cents) as avg_order_cents
     FROM orders
     WHERE status NOT IN ('draft', 'cancelled')
       AND created_at BETWEEN ? AND ?
     GROUP BY period
     ORDER BY period ASC`
  ).all(from, to);

  return rows;
}

export function getRevenueReport(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);

  const summary = db.prepare(
    `SELECT
       SUM(total_cents) as total_revenue_cents,
       COUNT(*) as total_orders,
       AVG(total_cents) as avg_order_cents,
       COUNT(DISTINCT customer_id) as unique_customers
     FROM orders
     WHERE status NOT IN ('draft', 'cancelled') AND created_at BETWEEN ? AND ?`
  ).get(from, to);

  const daily = db.prepare(
    `SELECT
       strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch')) as date,
       SUM(total_cents) as revenue_cents,
       COUNT(*) as order_count
     FROM orders
     WHERE status NOT IN ('draft', 'cancelled') AND created_at BETWEEN ? AND ?
     GROUP BY date ORDER BY date ASC`
  ).all(from, to);

  return { summary, daily };
}

export function getTopProducts(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);
  const limit = parseInt(query.limit || '10', 10);

  return db.prepare(
    `SELECT
       p.id, p.name, p.sku, p.category,
       SUM(oi.quantity) as total_quantity_sold,
       SUM(oi.line_total_cents) as total_revenue_cents
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status NOT IN ('draft', 'cancelled') AND o.created_at BETWEEN ? AND ?
     GROUP BY p.id ORDER BY total_revenue_cents DESC LIMIT ?`
  ).all(from, to, limit);
}

export function getTopCustomers(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);
  const limit = parseInt(query.limit || '10', 10);

  return db.prepare(
    `SELECT
       c.id, c.name, c.email, c.company,
       COUNT(o.id) as total_orders,
       SUM(o.total_cents) as total_revenue_cents
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.status NOT IN ('draft', 'cancelled') AND o.created_at BETWEEN ? AND ?
     GROUP BY c.id ORDER BY total_revenue_cents DESC LIMIT ?`
  ).all(from, to, limit);
}

export function getInventoryValuation() {
  return db.prepare(
    `SELECT
       p.id, p.sku, p.name, p.category,
       i.quantity_on_hand,
       p.cost_price_cents,
       p.unit_price_cents,
       (i.quantity_on_hand * p.cost_price_cents) as cost_value_cents,
       (i.quantity_on_hand * p.unit_price_cents) as sell_value_cents
     FROM products p
     JOIN inventory i ON i.product_id = p.id
     WHERE p.deleted_at IS NULL
     ORDER BY cost_value_cents DESC`
  ).all();
}

export function getOrderStatusBreakdown() {
  return db.prepare(
    `SELECT status, COUNT(*) as count, SUM(total_cents) as total_cents
     FROM orders GROUP BY status ORDER BY count DESC`
  ).all();
}

export function getInvoiceAging() {
  const now = Date.now();
  const rows = db.prepare(
    `SELECT i.*, c.name as customer_name, o.order_number,
            (? - i.due_date) as days_overdue
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     JOIN orders o ON o.id = i.order_id
     WHERE i.status IN ('sent', 'overdue')
     ORDER BY days_overdue DESC`
  ).all(now) as Array<{ total_cents: number; amount_paid_cents: number; days_overdue: number }>;

  const buckets = {
    current: rows.filter((r) => r.days_overdue <= 0),
    '1_30': rows.filter((r) => r.days_overdue > 0 && r.days_overdue <= 30 * 86400000),
    '31_60': rows.filter((r) => r.days_overdue > 30 * 86400000 && r.days_overdue <= 60 * 86400000),
    '61_90': rows.filter((r) => r.days_overdue > 60 * 86400000 && r.days_overdue <= 90 * 86400000),
    over_90: rows.filter((r) => r.days_overdue > 90 * 86400000),
  };

  return { rows, buckets };
}

export function getDashboardKpis() {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const revenue = db.prepare(
    `SELECT COALESCE(SUM(total_cents), 0) as revenue_cents FROM orders
     WHERE status NOT IN ('draft', 'cancelled') AND created_at >= ?`
  ).get(thirtyDaysAgo) as { revenue_cents: number };

  const ordersThisMonth = db.prepare(
    `SELECT COUNT(*) as cnt FROM orders WHERE created_at >= ?`
  ).get(thirtyDaysAgo) as { cnt: number };

  const openInvoices = db.prepare(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents - amount_paid_cents), 0) as outstanding_cents
     FROM invoices WHERE status IN ('sent', 'overdue')`
  ).get() as { cnt: number; outstanding_cents: number };

  const lowStock = db.prepare(
    `SELECT COUNT(*) as cnt FROM inventory WHERE quantity_on_hand <= reorder_point`
  ).get() as { cnt: number };

  return {
    revenue_30d_cents: revenue.revenue_cents,
    orders_30d: ordersThisMonth.cnt,
    open_invoices: openInvoices.cnt,
    open_invoices_outstanding_cents: openInvoices.outstanding_cents,
    low_stock_products: lowStock.cnt,
  };
}
