// Open Store — Real-Time Gateway (WebSocket)
// Per BACKEND.md §6: one WSS connection per client. Handles chat (message:new,
// message:status, typing), presence, and notifications. Presence is ephemeral.

import { WebSocketServer } from 'ws';
import { verifyToken } from './auth.js';
import { db } from './store.js';

/** userId -> Set<socket> (a user may have several devices/tabs). */
const sockets = new Map();
/** userId -> last presence ping (ms). */
const presence = new Map();

function add(userId, ws) {
  if (!sockets.has(userId)) sockets.set(userId, new Set());
  sockets.get(userId).add(ws);
  presence.set(userId, Date.now());
}
function remove(userId, ws) {
  sockets.get(userId)?.delete(ws);
  if (sockets.get(userId)?.size === 0) sockets.delete(userId);
}

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, payload }));
}

/** Push an event to every socket of a user. */
export function emitToUser(userId, type, payload) {
  for (const ws of sockets.get(userId) || []) send(ws, type, payload);
}

/** Push an event to all members of a conversation. */
export function emitToConversation(conversationId, type, payload, exceptUserId) {
  const convo = db.get('conversations', conversationId);
  if (!convo) return;
  for (const uid of convo.memberIds) {
    if (uid === exceptUserId) continue;
    emitToUser(uid, type, payload);
  }
}

export function isOnline(userId) {
  const last = presence.get(userId);
  return !!last && Date.now() - last < 60000;
}

/** Attach the WS gateway to an http server. */
export function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate from ?token= on the upgrade URL.
    const url = new URL(req.url, 'http://localhost');
    const payload = verifyToken(url.searchParams.get('token') || '');
    if (!payload) { ws.close(4001, 'unauthorized'); return; }
    const userId = payload.sub;
    add(userId, ws);
    send(ws, 'ready', { userId });
    // Announce presence to anyone in a conversation with this user.
    broadcastPresence(userId, true);

    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }
      const { type, payload: p } = msg || {};

      if (type === 'presence:ping') { presence.set(userId, Date.now()); return; }

      if (type === 'typing:start' || type === 'typing:stop') {
        emitToConversation(p.conversationId, 'typing', { conversationId: p.conversationId, userId, active: type === 'typing:start' }, userId);
        return;
      }

      if (type === 'message:send') {
        const convo = db.get('conversations', p.conversationId);
        if (!convo || !convo.memberIds.includes(userId)) return;
        const message = db.put('messages', {
          conversationId: p.conversationId, senderId: userId,
          text: p.text || '', replyTo: p.replyTo || null,
          status: 'sent', createdAt: new Date().toISOString(),
        });
        db.put('conversations', { ...convo, lastMessageAt: message.createdAt });
        emitToConversation(p.conversationId, 'message:new', { message });
        // Mark delivered for online recipients.
        for (const uid of convo.memberIds) {
          if (uid !== userId && isOnline(uid)) {
            db.put('messages', { ...message, status: 'delivered' });
            emitToConversation(p.conversationId, 'message:status', { id: message.id, status: 'delivered' });
            break;
          }
        }
        return;
      }

      if (type === 'read') {
        const convo = db.get('conversations', p.conversationId);
        if (!convo) return;
        for (const m of db.query('messages', (m) => m.conversationId === p.conversationId && m.senderId !== userId && m.status !== 'read')) {
          db.put('messages', { ...m, status: 'read' });
        }
        emitToConversation(p.conversationId, 'message:status', { conversationId: p.conversationId, status: 'read', by: userId }, userId);
        return;
      }
    });

    ws.on('close', () => {
      remove(userId, ws);
      if (!sockets.has(userId)) broadcastPresence(userId, false);
    });
    ws.on('error', () => {});
  });

  // Presence heartbeat sweep.
  setInterval(() => {
    for (const [uid, last] of presence) {
      if (Date.now() - last > 70000) { presence.delete(uid); broadcastPresence(uid, false); }
    }
  }, 30000).unref?.();

  return wss;
}

/** Tell everyone who shares a conversation with this user about their presence. */
function broadcastPresence(userId, online) {
  const peers = new Set();
  for (const c of db.query('conversations', (c) => c.memberIds.includes(userId))) {
    for (const uid of c.memberIds) if (uid !== userId) peers.add(uid);
  }
  for (const uid of peers) emitToUser(uid, 'presence', { userId, online, at: new Date().toISOString() });
}
