import pool from '../../config/database';
import bcrypt from 'bcryptjs';
import { signToken } from '../../utils/jwt';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'sales' | 'warehouse';
  is_active: boolean;
}

export async function login(email: string, password: string) {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  );
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }

  const token = signToken({ sub: user.id, role: user.role, name: user.name, email: user.email });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function getMe(userId: number) {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [userId]
  );
  return rows[0] || null;
}

export async function updateMe(userId: number, data: { name?: string; password?: string }) {
  const now = Date.now();
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [hash, now, userId]);
  }
  if (data.name) {
    await pool.query('UPDATE users SET name = $1, updated_at = $2 WHERE id = $3', [data.name, now, userId]);
  }
  return getMe(userId);
}
