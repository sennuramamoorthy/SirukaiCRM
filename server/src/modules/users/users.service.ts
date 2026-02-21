import db from '../../config/database';
import bcrypt from 'bcryptjs';

export function listUsers() {
  return db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
}

export function getUserById(id: number) {
  return db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(id);
}

export function createUser(data: { name: string; email: string; password: string; role: string }) {
  const hash = bcrypt.hashSync(data.password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(data.name, data.email, hash, data.role) as { lastInsertRowid: number };
  return getUserById(result.lastInsertRowid);
}

export function updateUser(id: number, data: { name?: string; email?: string; role?: string; is_active?: boolean }) {
  const now = Date.now();
  if (data.name !== undefined) db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(data.name, now, id);
  if (data.email !== undefined) db.prepare('UPDATE users SET email = ?, updated_at = ? WHERE id = ?').run(data.email, now, id);
  if (data.role !== undefined) db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(data.role, now, id);
  if (data.is_active !== undefined) db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(data.is_active ? 1 : 0, now, id);
  return getUserById(id);
}

export function deleteUser(id: number) {
  db.prepare('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?').run(Date.now(), id);
}
