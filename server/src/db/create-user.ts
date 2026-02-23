/**
 * CLI script to create a new CRM user.
 *
 * Usage:
 *   npm run create-user --workspace=server -- --name="Jane Doe" --email="jane@example.com" --password="Secret123!" --role=sales
 *
 * Roles: admin | sales | warehouse
 */

import pool, { runMigrations } from '../config/database';
import bcrypt from 'bcryptjs';

const VALID_ROLES = ['admin', 'sales', 'warehouse'] as const;
type Role = typeof VALID_ROLES[number];

function parseArgs(): { name: string; email: string; password: string; role: Role } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const entry = args.find((a) => a.startsWith(`--${flag}=`));
    return entry ? entry.slice(flag.length + 3) : undefined;
  };

  const name = get('name');
  const email = get('email');
  const password = get('password');
  const role = get('role');

  const errors: string[] = [];
  if (!name)     errors.push('--name is required');
  if (!email)    errors.push('--email is required');
  if (!password) errors.push('--password is required');
  if (!role)     errors.push('--role is required (admin | sales | warehouse)');
  else if (!VALID_ROLES.includes(role as Role)) {
    errors.push(`--role must be one of: ${VALID_ROLES.join(', ')} (got "${role}")`);
  }

  if (errors.length > 0) {
    console.error('[create-user] Invalid arguments:');
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    console.error('');
    console.error('Usage:');
    console.error('  npm run create-user --workspace=server -- --name="Jane Doe" --email="jane@example.com" --password="Secret123!" --role=sales');
    process.exit(1);
  }

  return { name: name!, email: email!, password: password!, role: role as Role };
}

async function createUser() {
  const { name, email, password, role } = parseArgs();

  console.log('[create-user] Connecting to database...');
  await runMigrations();

  // Check for duplicate email before hashing
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existing.length > 0) {
    console.error(`[create-user] ✗ A user with email "${email}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role]
  );

  const user = rows[0];
  console.log('[create-user] ✓ User created successfully!');
  console.log('');
  console.log(`  ID:    ${user.id}`);
  console.log(`  Name:  ${user.name}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Role:  ${user.role}`);
}

createUser()
  .catch((err) => {
    console.error('[create-user] Fatal error:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
