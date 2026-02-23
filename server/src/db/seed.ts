import pool, { runMigrations } from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('[Seed] Running migrations...');
  await runMigrations();

  const client = await pool.connect();
  try {
    console.log('[Seed] Starting...');

    // Seed users
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const salesHash = await bcrypt.hash('Sales123!', 10);
    const warehouseHash = await bcrypt.hash('Warehouse123!', 10);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Admin User', 'admin@crm.local', adminHash, 'admin']
    );
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Sales Rep', 'sales@crm.local', salesHash, 'sales']
    );
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Warehouse Staff', 'warehouse@crm.local', warehouseHash, 'warehouse']
    );

    // Seed customers
    const customers = [
      { name: 'Acme Corporation', email: 'orders@acme.com', phone: '555-0101', company: 'Acme Corp', billing_address: '123 Main St, Springfield, IL 62701', shipping_address: '123 Main St, Springfield, IL 62701' },
      { name: 'TechStart Inc.', email: 'procurement@techstart.io', phone: '555-0202', company: 'TechStart Inc.', billing_address: '456 Innovation Ave, Austin, TX 78701', shipping_address: '456 Innovation Ave, Austin, TX 78701' },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '555-0303', company: null, billing_address: '789 Oak Lane, Seattle, WA 98101', shipping_address: '789 Oak Lane, Seattle, WA 98101' },
    ];

    for (const c of customers) {
      await client.query(
        `INSERT INTO customers (name, email, phone, company, billing_address, shipping_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [c.name, c.email, c.phone, c.company, c.billing_address, c.shipping_address]
      );
    }

    // Seed products + inventory
    const products = [
      { sku: 'LAPTOP-PRO-15', name: 'Laptop Pro 15"', description: 'High-performance laptop', category: 'Electronics', unit_price_cents: 149999, cost_price_cents: 110000, unit: 'unit', qty: 50, reorder: 10, reorder_qty: 20 },
      { sku: 'MOUSE-WRLS-01', name: 'Wireless Mouse', description: 'Ergonomic wireless mouse', category: 'Electronics', unit_price_cents: 4999, cost_price_cents: 2500, unit: 'unit', qty: 200, reorder: 30, reorder_qty: 100 },
      { sku: 'KBRD-MECH-BLU', name: 'Mechanical Keyboard', description: 'Blue switch mechanical keyboard', category: 'Electronics', unit_price_cents: 12999, cost_price_cents: 7000, unit: 'unit', qty: 80, reorder: 15, reorder_qty: 50 },
      { sku: 'MNTR-4K-27', name: '4K Monitor 27"', description: '4K UHD IPS Display', category: 'Electronics', unit_price_cents: 59999, cost_price_cents: 40000, unit: 'unit', qty: 30, reorder: 5, reorder_qty: 10 },
      { sku: 'HDST-NOIS-CNL', name: 'Noise-Cancelling Headset', description: 'Over-ear headset with ANC', category: 'Electronics', unit_price_cents: 29999, cost_price_cents: 18000, unit: 'unit', qty: 5, reorder: 10, reorder_qty: 30 },
      { sku: 'DSKMAT-XL-01', name: 'XL Desk Mat', description: 'Large desk mat 90x40cm', category: 'Accessories', unit_price_cents: 2999, cost_price_cents: 1200, unit: 'unit', qty: 150, reorder: 20, reorder_qty: 80 },
    ];

    for (const p of products) {
      const { rows } = await client.query(
        `INSERT INTO products (sku, name, description, category, unit_price_cents, cost_price_cents, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (sku) DO NOTHING
         RETURNING id`,
        [p.sku, p.name, p.description, p.category, p.unit_price_cents, p.cost_price_cents, p.unit]
      );

      if (rows.length > 0) {
        const productId = rows[0].id;
        await client.query(
          `INSERT INTO inventory (product_id, quantity_on_hand, reorder_point, reorder_quantity)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (product_id) DO NOTHING`,
          [productId, p.qty, p.reorder, p.reorder_qty]
        );
      }
    }

    // Seed a supplier
    await client.query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address, payment_terms)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      ['TechDistrib Global', 'Bob Supplier', 'orders@techdistrib.com', '555-9001', '100 Warehouse Blvd, Chicago, IL 60601', 'Net 30']
    );

    console.log('[Seed] Complete!');
    console.log('');
    console.log('Default credentials:');
    console.log('  Admin:     admin@crm.local     / Admin123!');
    console.log('  Sales:     sales@crm.local     / Sales123!');
    console.log('  Warehouse: warehouse@crm.local / Warehouse123!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
