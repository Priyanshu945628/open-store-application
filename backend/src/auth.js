// Open Store — Auth (JWT)
// Per BACKEND.md §8: JWT access tokens, password hashing, auth guard on every
// protected route. Kept intentionally small for the demo; structure matches prod.

import jwt from 'jsonwebtoken';
import { db } from './store.js';

const SECRET = process.env.JWT_SECRET || 'open-store-dev-secret-change-me';
const TTL = '7d';

export function signToken(user) {
  return jwt.sign({ sub: user.id, handle: user.handle, role: user.role }, SECRET, { expiresIn: TTL });
}

export function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

/** Public-safe view of a user (never leak passwordHash). */
export function publicUser(u) {
  if (!u) return null;
  const followers = db.count('connections', (c) => c.toId === u.id && c.status === 'accepted');
  const following = db.count('connections', (c) => c.fromId === u.id && c.status === 'accepted');
  const posts = db.count('posts', (p) => p.authorId === u.id);
  return {
    id: u.id, handle: u.handle, name: u.name, bio: u.bio,
    avatarRef: u.avatarRef, bannerRef: u.bannerRef,
    role: u.role, verified: !!u.verified, isPrivate: !!u.isPrivate,
    stats: { followers, following, posts },
    createdAt: u.createdAt,
  };
}

/** Express middleware: attaches req.user, or 401. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: { code: 'unauthorized', message: 'Sign in to continue.' } });
  const user = db.get('users', payload.sub);
  if (!user) return res.status(401).json({ error: { code: 'unauthorized', message: 'Account not found.' } });
  req.user = user;
  next();
}

/** Soft auth: attaches req.user if a token is present, but never blocks. */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (payload) req.user = db.get('users', payload.sub) || null;
  next();
}
