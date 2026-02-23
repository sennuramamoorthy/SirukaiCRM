-- ============================================================
-- MIGRATION 001: Initial Schema (PostgreSQL)
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL  PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('admin', 'sales', 'warehouse')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at    BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id               SERIAL PRIMARY KEY,
  name             TEXT   NOT NULL,
  email            TEXT,
  phone            TEXT,
  company          TEXT,
  billing_address  TEXT,
  shipping_address TEXT,
  notes            TEXT,
  deleted_at       BIGINT,
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_customers_name  ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id               SERIAL  PRIMARY KEY,
  sku              TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  description      TEXT,
  category         TEXT,
  unit_price_cents BIGINT  NOT NULL DEFAULT 0,
  cost_price_cents BIGINT  NOT NULL DEFAULT 0,
  unit             TEXT    NOT NULL DEFAULT 'unit',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at       BIGINT,
  created_at       BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at       BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
  id                SERIAL PRIMARY KEY,
  product_id        INT    NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand  INT    NOT NULL DEFAULT 0,
  quantity_reserved INT    NOT NULL DEFAULT 0,
  reorder_point     INT    NOT NULL DEFAULT 0,
  reorder_quantity  INT    NOT NULL DEFAULT 0,
  location          TEXT,
  last_counted_at   BIGINT,
  updated_at        BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id               SERIAL PRIMARY KEY,
  product_id       INT    NOT NULL REFERENCES products(id),
  transaction_type TEXT   NOT NULL CHECK(transaction_type IN (
    'sale', 'purchase_receipt', 'adjustment', 'return', 'write_off'
  )),
  quantity_change  INT    NOT NULL,
  reference_type   TEXT,
  reference_id     INT,
  notes            TEXT,
  created_by       INT    REFERENCES users(id),
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_ref        ON inventory_transactions(reference_type, reference_id);

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id               SERIAL PRIMARY KEY,
  order_number     TEXT   NOT NULL UNIQUE,
  customer_id      INT    NOT NULL REFERENCES customers(id),
  assigned_to      INT    REFERENCES users(id),
  status           TEXT   NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  )),
  shipping_address TEXT,
  notes            TEXT,
  subtotal_cents   BIGINT NOT NULL DEFAULT 0,
  discount_cents   BIGINT NOT NULL DEFAULT 0,
  tax_cents        BIGINT NOT NULL DEFAULT 0,
  total_cents      BIGINT NOT NULL DEFAULT 0,
  ordered_at       BIGINT,
  shipped_at       BIGINT,
  delivered_at     BIGINT,
  cancelled_at     BIGINT,
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id               SERIAL        PRIMARY KEY,
  order_id         INT           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INT           NOT NULL REFERENCES products(id),
  quantity         INT           NOT NULL CHECK(quantity > 0),
  unit_price_cents BIGINT        NOT NULL,
  discount_pct     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  line_total_cents BIGINT        NOT NULL,
  created_at       BIGINT        NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id                SERIAL PRIMARY KEY,
  invoice_number    TEXT   NOT NULL UNIQUE,
  order_id          INT    NOT NULL UNIQUE REFERENCES orders(id),
  customer_id       INT    NOT NULL REFERENCES customers(id),
  status            TEXT   NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'sent', 'paid', 'overdue', 'cancelled'
  )),
  subtotal_cents    BIGINT NOT NULL,
  tax_cents         BIGINT NOT NULL,
  discount_cents    BIGINT NOT NULL,
  total_cents       BIGINT NOT NULL,
  amount_paid_cents BIGINT NOT NULL DEFAULT 0,
  due_date          BIGINT,
  sent_at           BIGINT,
  paid_at           BIGINT,
  notes             TEXT,
  created_at        BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at        BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id    ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(status);

-- SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id            SERIAL  PRIMARY KEY,
  name          TEXT    NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  payment_terms TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    BIGINT,
  created_at    BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at    BIGINT  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- SUPPLIER PRODUCTS (many-to-many)
CREATE TABLE IF NOT EXISTS supplier_products (
  id                 SERIAL  PRIMARY KEY,
  supplier_id        INT     NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id         INT     NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  supplier_sku       TEXT,
  cost_price_cents   BIGINT  NOT NULL DEFAULT 0,
  lead_time_days     INT     NOT NULL DEFAULT 0,
  min_order_quantity INT     NOT NULL DEFAULT 1,
  is_preferred       BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(supplier_id, product_id)
);

-- PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id             SERIAL PRIMARY KEY,
  po_number      TEXT   NOT NULL UNIQUE,
  supplier_id    INT    NOT NULL REFERENCES suppliers(id),
  created_by     INT    REFERENCES users(id),
  status         TEXT   NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled'
  )),
  expected_date  BIGINT,
  received_at    BIGINT,
  notes          TEXT,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  total_cents    BIGINT NOT NULL DEFAULT 0,
  created_at     BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at     BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status      ON purchase_orders(status);

-- PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                SERIAL PRIMARY KEY,
  purchase_order_id INT    NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        INT    NOT NULL REFERENCES products(id),
  quantity_ordered  INT    NOT NULL CHECK(quantity_ordered > 0),
  quantity_received INT    NOT NULL DEFAULT 0,
  unit_cost_cents   BIGINT NOT NULL,
  line_total_cents  BIGINT NOT NULL,
  created_at        BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_poi_po_id      ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product_id ON purchase_order_items(product_id);

-- SHIPMENTS
CREATE TABLE IF NOT EXISTS shipments (
  id                 SERIAL PRIMARY KEY,
  shipment_number    TEXT   NOT NULL UNIQUE,
  order_id           INT    NOT NULL REFERENCES orders(id),
  carrier            TEXT,
  tracking_number    TEXT,
  status             TEXT   NOT NULL DEFAULT 'pending' CHECK(status IN (
    'pending', 'picked', 'packed', 'dispatched', 'in_transit', 'delivered', 'returned'
  )),
  shipped_at         BIGINT,
  estimated_delivery BIGINT,
  actual_delivery    BIGINT,
  notes              TEXT,
  created_at         BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at         BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status   ON shipments(status);
