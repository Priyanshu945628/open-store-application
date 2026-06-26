// Open Store — Real-Time Gateway (Polling mode for Vercel serverless)
// WebSocket removed. Clients poll for messages, notifications, and presence.

import { db } from './store.js';

/** Check if a user is online (last ping within 60s). */
export function isOnline(userId) {
  const rec = db.get('presence', userId);
  return !!rec && Date.now() - new Date(rec.lastPingAt).getTime() < 60000;
}

/** Update a user's presence timestamp. */
export function updatePresence(userId) {
  db.put('presence', { id: userId, lastPingAt: new Date().toISOString() });
}

// No-ops for WS-only features (called from api.js / index.js)
export function emitToUser() {}
export function emitToConversation() {}
export function attachRealtime() { return null; }
