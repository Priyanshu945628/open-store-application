// Open Store — Storage Abstraction
// ---------------------------------
// Per BACKEND.md §4 and DATA_MODEL.md: all data/media flows through the
// DataStore / MediaStore interfaces so Telegram (the real backend) can be
// swapped in later WITHOUT touching business logic.
//
//   interface DataStore  { put(table, rec) | get(table, id) | query(table, fn) | delete(table, id) }
//   interface MediaStore { putBlob(bytes, meta) -> ref | getRange(ref, off, len) | delete(ref) }
//
// This file ships an in-memory implementation (the "fast index" + a stand-in
// for the Telegram blob store) so the app runs with `npm install && npm run dev`
// — no Postgres / Redis / Telegram required. Replace these two classes with
// TelegramDataStore / TelegramMediaStore + a Postgres index to go to production.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import { TelegramClient } from "./telegram.js";

const DATA_FILE = path.join(__dirname, "..", "data", "db.json");

/** The queryable index. In production this is Postgres; here it is Maps persisted to JSON on disk. */
export class MemoryDataStore {
  constructor(file = DATA_FILE) {
    /** @type {Map<string, Map<string, any>>} table -> (id -> record) */
    this.tables = new Map();
    this.file = file;
    this._load();
  }

  _table(name) {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name);
  }

  _load() {
    if (!this.file || !fs.existsSync(this.file)) return;
    try {
      const obj = JSON.parse(fs.readFileSync(this.file, "utf8"));
      for (const [table, rows] of Object.entries(obj)) {
        const m = new Map();
        for (const r of rows) m.set(r.id, r);
        this.tables.set(table, m);
      }
    } catch (e) {
      console.warn("Could not load data file:", e.message);
    }
  }

  _save() {
    if (!this.file) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        const obj = {};
        for (const [table, m] of this.tables) obj[table] = [...m.values()];
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify(obj));
      } catch (e) {
        console.warn("Could not save data file:", e.message);
      }
    }, 250);
  }

  /** put: insert/update a record. Mirrors a Telegram channel-as-table write + index row. */
  put(table, record) {
    const id = record.id || nanoid(12);
    const now = new Date().toISOString();
    const existing = this._table(table).get(id);
    const saved = {
      ...record,
      id,
      createdAt: record.createdAt || existing?.createdAt || now,
      updatedAt: now,
      // tg_ref: where the canonical record would live in Telegram (simulated).
      tgRef: existing?.tgRef || {
        channel: `db_${table}`,
        messageId: Math.floor(100000 + Math.random() * 900000),
      },
    };
    this._table(table).set(id, saved);
    this._save();
    return saved;
  }

  get(table, id) {
    return this._table(table).get(id) || null;
  }

  /** query: the index does the filtering Telegram can't. fn is a predicate. */
  query(table, fn = () => true) {
    return [...this._table(table).values()].filter(fn);
  }

  /** find first matching record. */
  find(table, fn) {
    return this.query(table, fn)[0] || null;
  }

  delete(table, id) {
    const ok = this._table(table).delete(id);
    this._save();
    return ok;
  }

  count(table, fn) {
    return this.query(table, fn).length;
  }
}

/** Media blob store. In production this is Telegram + a cache; here it's a Map of refs. */
export class MemoryMediaStore {
  constructor() {
    this.blobs = new Map();
  }

  /** putBlob -> returns a media ref (stands in for a Telegram file_id). */
  putBlob(bytes, meta = {}) {
    const fileId = `mref_${nanoid(16)}`;
    this.blobs.set(fileId, { bytes, meta });
    return { fileId, ...meta };
  }

  getRange(ref, offset = 0, length) {
    const blob = this.blobs.get(ref?.fileId);
    if (!blob) return null;
    return length ? blob.bytes.slice(offset, offset + length) : blob.bytes;
  }

  delete(ref) {
    return this.blobs.delete(ref?.fileId);
  }
}

// ===========================================================================
// TelegramDataStore — MemoryDataStore + async write-through to Telegram.
// Per BACKEND.md §4.3 / DATA_MODEL.md §2: same DataStore interface, Telegram
// acts as the durable canonical store; the index stays fast and local.
//
// Write path: index updated synchronously → Telegram written asynchronously.
// Read path:  always from the local index, never scanning Telegram.
// ===========================================================================
export class TelegramDataStore extends MemoryDataStore {
  /**
   * @param {import('./telegram.js').TelegramClient} client  Telegram API client
   * @param {string|number} dbChatId  Numeric ID of the private "db" channel
   * @param {string} [file]           Path for the JSON index file
   */
  constructor(client, dbChatId, file) {
    super(file);
    this.tg = client;
    this.chatId = String(dbChatId);
  }

  /** put: index first (sync), Telegram after (async, non-blocking). */
  put(table, record) {
    const saved = super.put(table, record);
    this._writeTg(table, saved).catch((e) =>
      console.warn(`[TG] put ${table}/${saved.id}:`, e.message),
    );
    return saved;
  }

  /** delete: remove from index synchronously, delete from Telegram asynchronously. */
  delete(table, id) {
    const rec = this.get(table, id);
    const ok = super.delete(table, id);
    if (ok && rec?.tgRef?.messageId && rec?.tgRef?.channel === this.chatId) {
      this.tg
        .deleteRecord(this.chatId, rec.tgRef.messageId)
        .catch((e) => console.warn(`[TG] delete ${table}/${id}:`, e.message));
    }
    return ok;
  }

  async _writeTg(table, record) {
    const payload = { _table: table, ...record };
    // Fix fake tgRef from MemoryDataStore
    if (payload.tgRef && payload.tgRef.channel !== this.chatId) {
      payload.tgRef = { ...payload.tgRef, channel: this.chatId };
    }
    // Only edit if the tgRef points to our real channel (not the fake in-memory ref).
    if (record.tgRef?.messageId && record.tgRef?.channel === this.chatId) {
      // Update existing Telegram message (edit in place)
      await this.tg.editRecord(this.chatId, record.tgRef.messageId, payload);
    } else {
      // New record (or fake tgRef from MemoryDataStore): send to Telegram,
      // then update the index with the real messageId in tgRef.
      const { messageId } = await this.tg.sendRecord(this.chatId, payload);
      // Call super.put directly to avoid triggering another TG write.
      super.put(table, {
        ...record,
        tgRef: { channel: this.chatId, messageId },
      });
    }
  }
}

// ===========================================================================
// TelegramMediaStore — uploads binary blobs to a Telegram channel.
// Disk is the local cache; Telegram holds the durable blob (file_id).
// ===========================================================================
export class TelegramMediaStore extends MemoryMediaStore {
  /**
   * @param {import('./telegram.js').TelegramClient} client
   * @param {string|number} mediaChatId  Numeric ID of the private "media" channel
   */
  constructor(client, mediaChatId) {
    super();
    this.tg = client;
    this.chatId = String(mediaChatId);
  }

  /**
   * Upload a binary blob to Telegram and cache locally.
   * Returns { fileId, tgFileId } — tgFileId is Telegram's durable reference.
   */
  async putBlobRemote(
    buffer,
    meta = {},
    filename = "blob",
    mimeType = "application/octet-stream",
  ) {
    const isLocal = this.tg?.isLocal;
    const MAX_TG = isLocal ? 2 * 1024 * 1024 * 1024 : 50 * 1024 * 1024;
    if (buffer.length > MAX_TG) {
      const limit = isLocal ? '2GB' : '50MB';
      console.warn(`[TG] Skipping Telegram backup: ${filename} is ${(buffer.length / 1048576).toFixed(1)}MB (limit ${limit})`);
      return super.putBlob(buffer, meta);
    }
    const tgFileId = await this.tg.sendFile(
      this.chatId,
      buffer,
      filename,
      mimeType,
    );
    const ref = super.putBlob(buffer, { ...meta, tgFileId });
    return { ...ref, tgFileId };
  }

  /**
   * Retrieve a blob; if not cached locally, download from Telegram.
   * Returns Buffer or null.
   */
  async getBlobRemote(fileId) {
    const rec = this.blobs.get(fileId);
    if (rec?.bytes) return rec.bytes; // local cache hit
    if (rec?.meta?.tgFileId) {
      const buf = await this.tg.downloadFile(rec.meta.tgFileId);
      if (rec) rec.bytes = buf; // populate local cache
      return buf;
    }
    return null;
  }
}

// ===========================================================================
// Singletons — automatically uses Telegram stores when env vars are present;
// falls back to in-memory mode (zero-config) when they are not.
//
// Required env vars to enable Telegram persistence:
//   TELEGRAM_BOT_TOKEN   — your bot token from @BotFather
//   TELEGRAM_DB_CHAT     — numeric ID of your private DB channel
// Optional:
//   TELEGRAM_MEDIA_CHAT  — numeric ID of your private media channel
//                          (defaults to TELEGRAM_DB_CHAT if not set)
// ===========================================================================
const _token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const _dbChat = process.env.TELEGRAM_DB_CHAT?.trim();
const _mediaChat = (
  process.env.TELEGRAM_MEDIA_CHAT || process.env.TELEGRAM_DB_CHAT
)?.trim();

let _db, _media;

if (_token && _dbChat) {
  try {
    const client = new TelegramClient(_token);
    _db = new TelegramDataStore(client, _dbChat);
    _media = new TelegramMediaStore(client, _mediaChat);
    // Async verification — non-blocking; server starts even if TG is temporarily offline
    client
      .getMe()
      .then(async (bot) => {
        console.log(`  ✦ Telegram storage active — @${bot.username}`);
        for (const [label, cid] of [["DB", _dbChat], ["Media", _mediaChat]]) {
          try {
            const info = await client.call("getChat", { chat_id: cid });
            console.log(`    ✓ ${label} channel accessible: ${info.title || cid}`);
          } catch (e) {
            console.warn(`    ✗ ${label} channel (${cid}): ${e.message}`);
            console.warn(`      → Add @${bot.username} as Admin with "Post Messages" in that channel, then restart.`);
          }
        }
      })
      .catch((e) =>
        console.warn(
          `  ⚠ Telegram bot check failed: ${e.message} (writes will retry)`,
        ),
      );
  } catch (e) {
    console.warn(
      "  ⚠ Telegram init error:",
      e.message,
      "— falling back to in-memory store",
    );
    _db = new MemoryDataStore();
    _media = new MemoryMediaStore();
  }
} else {
  _db = new MemoryDataStore();
  _media = new MemoryMediaStore();
}

export const db = _db;
export const media = _media;
export const tgClient = _db?.tg || null;
export const tgConfig = { token: _token || null, dbChat: _dbChat || null, mediaChat: _mediaChat || null };
export { nanoid };
