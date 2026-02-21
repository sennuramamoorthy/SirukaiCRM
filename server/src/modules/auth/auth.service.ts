import db from '../../config/database';
import bcrypt from 'bcryptjs';
import { signToken } from '../../utils/jwt';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'sales' | 'warehouse';
  is_active: number;
}

export function login(email: string, password: string) {
  const user = db
    .prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
    .get(email) as UserRow | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return null;
  }

  const token = signToken({ sub: user.id, role: user.role, name: user.name, email: user.email });
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export function getMe(userId: number) {
  return db
    .prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?')
    .get(userId) as UserRow | undefined;
}

export function updateMe(userId: number, data: { name?: string; password?: string }) {
  if (data.password) {
    const hash = bcrypt.hashSync(data.password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hash, Date.now(), userId);
  }
  if (data.name) {
    db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
      .run(data.name, Date.now(), userId);
  }
  return getMe(userId);
}
