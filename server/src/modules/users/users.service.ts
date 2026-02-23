import pool from '../../config/database';
import bcrypt from 'bcryptjs';

export async function listUsers() {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

export async function getUserById(id: number) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function createUser(data: { name: string; email: string; password: string; role: string }) {
  const hash = await bcrypt.hash(data.password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [data.name, data.email, hash, data.role]
  );
  return getUserById(rows[0].id);
}

export async function updateUser(id: number, data: { name?: string; email?: string; role?: string; is_active?: boolean }) {
  const now = Date.now();
  if (data.name !== undefined) await pool.query('UPDATE users SET name = $1, updated_at = $2 WHERE id = $3', [data.name, now, id]);
  if (data.email !== undefined) await pool.query('UPDATE users SET email = $1, updated_at = $2 WHERE id = $3', [data.email, now, id]);
  if (data.role !== undefined) await pool.query('UPDATE users SET role = $1, updated_at = $2 WHERE id = $3', [data.role, now, id]);
  if (data.is_active !== undefined) await pool.query('UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3', [data.is_active, now, id]);
  return getUserById(id);
}

export async function deleteUser(id: number) {
  await pool.query('UPDATE users SET is_active = FALSE, updated_at = $1 WHERE id = $2', [Date.now(), id]);
}
