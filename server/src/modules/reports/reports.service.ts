import pool from '../../config/database';

function defaultDates(query: Record<string, string | undefined>) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const from = query.from ? Number(query.from) : thirtyDaysAgo;
  const to = query.to ? Number(query.to) : now;
  return { from, to };
}

export async function getSalesReport(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);
  let groupFormat: string;
  if (query.group_by === 'week') {
    groupFormat = "to_char(to_timestamp(created_at / 1000), 'IYYY-IW')";
  } else if (query.group_by === 'month') {
    groupFormat = "to_char(to_timestamp(created_at / 1000), 'YYYY-MM')";
  } else {
    groupFormat = "to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD')";
  }

  const { rows } = await pool.query(
    `SELECT
       ${groupFormat} as period,
       COUNT(*) as order_count,
       SUM(total_cents) as revenue_cents,
       AVG(total_cents) as avg_order_cents
     FROM orders
     WHERE status NOT IN ('draft', 'cancelled')
       AND created_at BETWEEN $1 AND $2
     GROUP BY period
     ORDER BY period ASC`,
    [from, to]
  );
  return rows;
}

export async function getRevenueReport(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);

  const { rows: summaryRows } = await pool.query(
    `SELECT
       SUM(total_cents) as total_revenue_cents,
       COUNT(*) as total_orders,
       AVG(total_cents) as avg_order_cents,
       COUNT(DISTINCT customer_id) as unique_customers
     FROM orders
     WHERE status NOT IN ('draft', 'cancelled') AND created_at BETWEEN $1 AND $2`,
    [from, to]
  );

  const { rows: daily } = await pool.query(
    `SELECT
       to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD') as date,
       SUM(total_cents) as revenue_cents,
       COUNT(*) as order_count
     FROM orders
     WHERE status NOT IN ('draft', 'cancelled') AND created_at BETWEEN $1 AND $2
     GROUP BY date ORDER BY date ASC`,
    [from, to]
  );

  return { summary: summaryRows[0], daily };
}

export async function getTopProducts(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);
  const limit = parseInt(query.limit || '10', 10);

  const { rows } = await pool.query(
    `SELECT
       p.id, p.name, p.sku, p.category,
       SUM(oi.quantity) as total_quantity_sold,
       SUM(oi.line_total_cents) as total_revenue_cents
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     JOIN orders o ON o.id = oi.order_id
     WHERE o.status NOT IN ('draft', 'cancelled') AND o.created_at BETWEEN $1 AND $2
     GROUP BY p.id ORDER BY total_revenue_cents DESC LIMIT $3`,
    [from, to, limit]
  );
  return rows;
}

export async function getTopCustomers(query: Record<string, string | undefined>) {
  const { from, to } = defaultDates(query);
  const limit = parseInt(query.limit || '10', 10);

  const { rows } = await pool.query(
    `SELECT
       c.id, c.name, c.email, c.company,
       COUNT(o.id) as total_orders,
       SUM(o.total_cents) as total_revenue_cents
     FROM orders o JOIN customers c ON c.id = o.customer_id
     WHERE o.status NOT IN ('draft', 'cancelled') AND o.created_at BETWEEN $1 AND $2
     GROUP BY c.id ORDER BY total_revenue_cents DESC LIMIT $3`,
    [from, to, limit]
  );
  return rows;
}

export async function getInventoryValuation() {
  const { rows } = await pool.query(
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
  );
  return rows;
}

export async function getOrderStatusBreakdown() {
  const { rows } = await pool.query(
    'SELECT status, COUNT(*) as count, SUM(total_cents) as total_cents FROM orders GROUP BY status ORDER BY count DESC'
  );
  return rows;
}

export async function getInvoiceAging() {
  const now = Date.now();
  const { rows } = await pool.query(
    `SELECT i.*, c.name as customer_name, o.order_number,
            ($1 - i.due_date) as days_overdue
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     JOIN orders o ON o.id = i.order_id
     WHERE i.status IN ('sent', 'overdue')
     ORDER BY days_overdue DESC`,
    [now]
  );

  const MS_PER_DAY = 86400000;
  const buckets = {
    current: rows.filter((r: { days_overdue: string }) => Number(r.days_overdue) <= 0),
    '1_30': rows.filter((r: { days_overdue: string }) => Number(r.days_overdue) > 0 && Number(r.days_overdue) <= 30 * MS_PER_DAY),
    '31_60': rows.filter((r: { days_overdue: string }) => Number(r.days_overdue) > 30 * MS_PER_DAY && Number(r.days_overdue) <= 60 * MS_PER_DAY),
    '61_90': rows.filter((r: { days_overdue: string }) => Number(r.days_overdue) > 60 * MS_PER_DAY && Number(r.days_overdue) <= 90 * MS_PER_DAY),
    over_90: rows.filter((r: { days_overdue: string }) => Number(r.days_overdue) > 90 * MS_PER_DAY),
  };

  return { rows, buckets };
}

export async function getDashboardKpis() {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const { rows: revenueRows } = await pool.query(
    `SELECT COALESCE(SUM(total_cents), 0) as revenue_cents FROM orders
     WHERE status NOT IN ('draft', 'cancelled') AND created_at >= $1`,
    [thirtyDaysAgo]
  );

  const { rows: ordersRows } = await pool.query(
    'SELECT COUNT(*) as cnt FROM orders WHERE created_at >= $1',
    [thirtyDaysAgo]
  );

  const { rows: invoicesRows } = await pool.query(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents - amount_paid_cents), 0) as outstanding_cents
     FROM invoices WHERE status IN ('sent', 'overdue')`
  );

  const { rows: lowStockRows } = await pool.query(
    'SELECT COUNT(*) as cnt FROM inventory WHERE quantity_on_hand <= reorder_point'
  );

  return {
    revenue_30d_cents: Number(revenueRows[0].revenue_cents),
    orders_30d: parseInt(ordersRows[0].cnt, 10),
    open_invoices: parseInt(invoicesRows[0].cnt, 10),
    open_invoices_outstanding_cents: Number(invoicesRows[0].outstanding_cents),
    low_stock_products: parseInt(lowStockRows[0].cnt, 10),
  };
}
