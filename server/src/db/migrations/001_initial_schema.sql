-- ============================================================
-- MIGRATION 001: Initial Schema
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('admin', 'sales', 'warehouse')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  email            TEXT,
  phone            TEXT,
  company          TEXT,
  billing_address  TEXT,
  shipping_address TEXT,
  notes            TEXT,
  deleted_at       INTEGER,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_customers_name  ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  sku              TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  description      TEXT,
  category         TEXT,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  cost_price_cents INTEGER NOT NULL DEFAULT 0,
  unit             TEXT    NOT NULL DEFAULT 'unit',
  is_active        INTEGER NOT NULL DEFAULT 1,
  deleted_at       INTEGER,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id        INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand  INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  reorder_point     INTEGER NOT NULL DEFAULT 0,
  reorder_quantity  INTEGER NOT NULL DEFAULT 0,
  location          TEXT,
  last_counted_at   INTEGER,
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  transaction_type TEXT    NOT NULL CHECK(transaction_type IN (
    'sale', 'purchase_receipt', 'adjustment', 'return', 'write_off'
  )),
  quantity_change  INTEGER NOT NULL,
  reference_type   TEXT,
  reference_id     INTEGER,
  notes            TEXT,
  created_by       INTEGER REFERENCES users(id),
  created_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_ref        ON inventory_transactions(reference_type, reference_id);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number     TEXT    NOT NULL UNIQUE,
  customer_id      INTEGER NOT NULL REFERENCES customers(id),
  assigned_to      INTEGER REFERENCES users(id),
  status           TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  )),
  shipping_address TEXT,
  notes            TEXT,
  subtotal_cents   INTEGER NOT NULL DEFAULT 0,
  discount_cents   INTEGER NOT NULL DEFAULT 0,
  tax_cents        INTEGER NOT NULL DEFAULT 0,
  total_cents      INTEGER NOT NULL DEFAULT 0,
  ordered_at       INTEGER,
  shipped_at       INTEGER,
  delivered_at     INTEGER,
  cancelled_at     INTEGER,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  quantity         INTEGER NOT NULL CHECK(quantity > 0),
  unit_price_cents INTEGER NOT NULL,
  discount_pct     REAL    NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL,
  created_at       INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number    TEXT    NOT NULL UNIQUE,
  order_id          INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  customer_id       INTEGER NOT NULL REFERENCES customers(id),
  status            TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'sent', 'paid', 'overdue', 'cancelled'
  )),
  subtotal_cents    INTEGER NOT NULL,
  tax_cents         INTEGER NOT NULL,
  discount_cents    INTEGER NOT NULL,
  total_cents       INTEGER NOT NULL,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  due_date          INTEGER,
  sent_at           INTEGER,
  paid_at           INTEGER,
  notes             TEXT,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at        INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id    ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(status);

-- SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  payment_terms TEXT,
  notes         TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  deleted_at    INTEGER,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

-- SUPPLIER PRODUCTS (many-to-many)
CREATE TABLE IF NOT EXISTS supplier_products (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id        INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id         INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_sku       TEXT,
  cost_price_cents   INTEGER NOT NULL DEFAULT 0,
  lead_time_days     INTEGER NOT NULL DEFAULT 0,
  min_order_quantity INTEGER NOT NULL DEFAULT 1,
  is_preferred       INTEGER NOT NULL DEFAULT 0,
  UNIQUE(supplier_id, product_id)
);

-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number       TEXT    NOT NULL UNIQUE,
  supplier_id     INTEGER NOT NULL REFERENCES suppliers(id),
  created_by      INTEGER REFERENCES users(id),
  status          TEXT    NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'
  )),
  expected_date   INTEGER,
  received_at     INTEGER,
  notes           TEXT,
  subtotal_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents     INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status      ON purchase_orders(status);

-- PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products(id),
  quantity_ordered  INTEGER NOT NULL CHECK(quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_cost_cents   INTEGER NOT NULL,
  line_total_cents  INTEGER NOT NULL,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_poi_po_id      ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product_id ON purchase_order_items(product_id);

-- SHIPMENTS
CREATE TABLE IF NOT EXISTS shipments (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_number    TEXT    NOT NULL UNIQUE,
  order_id           INTEGER NOT NULL REFERENCES orders(id),
  carrier            TEXT,
  tracking_number    TEXT,
  status             TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending', 'picked', 'packed', 'dispatched', 'in_transit', 'delivered', 'returned'
  )),
  shipped_at         INTEGER,
  estimated_delivery INTEGER,
  actual_delivery    INTEGER,
  notes              TEXT,
  created_at         INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status   ON shipments(status);
