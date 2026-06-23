import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// Hash de senha com scrypt (node:crypto) — sem dependencia nativa,
// roda igual em alpine/Docker. Formato armazenado: scrypt$<saltHex>$<hashHex>.
const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

export async function hashPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('A senha precisa ter ao menos 8 caracteres.');
  }
  const salt = randomBytes(16);
  const dk = await scryptAsync(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${dk.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const dk = await scryptAsync(password, salt, expected.length);
  return dk.length === expected.length && timingSafeEqual(dk, expected);
}
