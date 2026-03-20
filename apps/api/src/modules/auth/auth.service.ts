import bcrypt from 'bcryptjs';
import { sql } from '../../db/client.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createUser(name: string, email: string, passwordHash: string) {
  const [user] = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name}, ${email}, ${passwordHash})
    RETURNING id, name, email, role, created_at
  `;
  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await sql`
    SELECT id, name, email, role, password_hash
    FROM users
    WHERE email = ${email}
  `;
  return user ?? null;
}
