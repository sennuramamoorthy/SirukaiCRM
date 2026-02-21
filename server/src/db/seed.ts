import '../config/database'; // runs migrations first
import db from '../config/database';
import bcrypt from 'bcryptjs';

console.log('[Seed] Starting...');

// Seed users
const adminHash = bcrypt.hashSync('Admin123!', 10);
const salesHash = bcrypt.hashSync('Sales123!', 10);
const warehouseHash = bcrypt.hashSync('Warehouse123!', 10);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, password_hash, role)
  VALUES (@name, @email, @password_hash, @role)
`);

insertUser.run({ name: 'Admin User', email: 'admin@crm.local', password_hash: adminHash, role: 'admin' });
insertUser.run({ name: 'Sales Rep', email: 'sales@crm.local', password_hash: salesHash, role: 'sales' });
insertUser.run({ name: 'Warehouse Staff', email: 'warehouse@crm.local', password_hash: warehouseHash, role: 'warehouse' });

// Seed customers
const insertCustomer = db.prepare(`
  INSERT OR IGNORE INTO customers (name, email, phone, company, billing_address, shipping_address)
  VALUES (@name, @email, @phone, @company, @billing_address, @shipping_address)
`);

insertCustomer.run({
  name: 'Acme Corporation',
  email: 'orders@acme.com',
  phone: '555-0101',
  company: 'Acme Corp',
  billing_address: '123 Main St, Springfield, IL 62701',
  shipping_address: '123 Main St, Springfield, IL 62701',
});

insertCustomer.run({
  name: 'TechStart Inc.',
  email: 'procurement@techstart.io',
  phone: '555-0202',
  company: 'TechStart Inc.',
  billing_address: '456 Innovation Ave, Austin, TX 78701',
  shipping_address: '456 Innovation Ave, Austin, TX 78701',
});

insertCustomer.run({
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '555-0303',
  company: null,
  billing_address: '789 Oak Lane, Seattle, WA 98101',
  shipping_address: '789 Oak Lane, Seattle, WA 98101',
});

// Seed products + inventory
const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (sku, name, description, category, unit_price_cents, cost_price_cents, unit)
  VALUES (@sku, @name, @description, @category, @unit_price_cents, @cost_price_cents, @unit)
`);

const insertInventory = db.prepare(`
  INSERT OR IGNORE INTO inventory (product_id, quantity_on_hand, reorder_point, reorder_quantity)
  VALUES (@product_id, @quantity_on_hand, @reorder_point, @reorder_quantity)
`);

const products = [
  { sku: 'LAPTOP-PRO-15', name: 'Laptop Pro 15"', description: 'High-performance laptop', category: 'Electronics', unit_price_cents: 149999, cost_price_cents: 110000, unit: 'unit', qty: 50, reorder: 10, reorder_qty: 20 },
  { sku: 'MOUSE-WRLS-01', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse', category: 'Electronics', unit_price_cents: 4999, cost_price_cents: 2500, unit: 'unit', qty: 200, reorder: 30, reorder_qty: 100 },
  { sku: 'KBRD-MECH-BLU', name: 'Mechanical Keyboard', description: 'Blue switch mechanical keyboard', category: 'Electronics', unit_price_cents: 12999, cost_price_cents: 7000, unit: 'unit', qty: 80, reorder: 15, reorder_qty: 50 },
  { sku: 'MNTR-4K-27', name: '4K Monitor 27"', description: '4K UHD IPS Display', category: 'Electronics', unit_price_cents: 59999, cost_price_cents: 40000, unit: 'unit', qty: 30, reorder: 5, reorder_qty: 10 },
  { sku: 'HDST-NOIS-CNL', name: 'Noise-Cancelling Headset', description: 'Over-ear headset with ANC', category: 'Electronics', unit_price_cents: 29999, cost_price_cents: 18000, unit: 'unit', qty: 5, reorder: 10, reorder_qty: 30 },
  { sku: 'DSKMAT-XL-01', name: 'XL Desk Mat', description: 'Large desk mat 90x40cm', category: 'Accessories', unit_price_cents: 2999, cost_price_cents: 1200, unit: 'unit', qty: 150, reorder: 20, reorder_qty: 80 },
];

for (const p of products) {
  const result = insertProduct.run({
    sku: p.sku, name: p.name, description: p.description,
    category: p.category, unit_price_cents: p.unit_price_cents,
    cost_price_cents: p.cost_price_cents, unit: p.unit,
  }) as { lastInsertRowid: number };

  if (result.lastInsertRowid) {
    insertInventory.run({
      product_id: result.lastInsertRowid,
      quantity_on_hand: p.qty,
      reorder_point: p.reorder,
      reorder_quantity: p.reorder_qty,
    });
  }
}

// Seed a supplier
const insertSupplier = db.prepare(`
  INSERT OR IGNORE INTO suppliers (name, contact_name, email, phone, address, payment_terms)
  VALUES (@name, @contact_name, @email, @phone, @address, @payment_terms)
`);

insertSupplier.run({
  name: 'TechDistrib Global',
  contact_name: 'Bob Supplier',
  email: 'orders@techdistrib.com',
  phone: '555-9001',
  address: '100 Warehouse Blvd, Chicago, IL 60601',
  payment_terms: 'Net 30',
});

console.log('[Seed] Complete!');
console.log('');
console.log('Default credentials:');
console.log('  Admin:     admin@crm.local     / Admin123!');
console.log('  Sales:     sales@crm.local     / Sales123!');
console.log('  Warehouse: warehouse@crm.local / Warehouse123!');
