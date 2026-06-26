// Open Store — Supabase DataStore (replaces MemoryDataStore on Vercel)
// Uses PostgreSQL via Supabase REST API. Survives cold starts.

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

let _client = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

/** SQL to run in Supabase SQL Editor:
 
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  "table" TEXT NOT NULL,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_table ON records("table");
CREATE INDEX IF NOT EXISTS idx_records_table_id ON records("table", id);

-- RLS: allow all operations from service role key
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON records FOR ALL USING (true) WITH CHECK (true);

*/

export class SupabaseDataStore {
  constructor() {
    this.client = getClient();
    this.tables = new Map(); // local cache for fast reads
    this._ready = this.client ? this._loadAll() : Promise.resolve();
  }

  async _loadAll() {
    if (!this.client) return;
    try {
      const { data, error } = await this.client
        .from('records')
        .select('*');
      if (error) {
        console.warn('[Supabase] Load error:', error.message);
        return;
      }
      for (const row of (data || [])) {
        if (!this.tables.has(row.table)) this.tables.set(row.table, new Map());
        this.tables.get(row.table).set(row.id, { ...row.data, id: row.id });
      }
      console.log(`  ✦ Supabase loaded ${data?.length || 0} records`);
    } catch (e) {
      console.warn('[Supabase] Load failed:', e.message);
    }
  }

  _table(name) {
    if (!this.tables.has(name)) this.tables.set(name, new Map());
    return this.tables.get(name);
  }

  _saveLocal(table, record) {
    this._table(table).set(record.id, record);
  }

  async _upsert(table, record) {
    if (!this.client) return;
    try {
      await this.client
        .from('records')
        .upsert({
          id: record.id,
          table,
          data: record,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }, { onConflict: 'id' });
    } catch (e) {
      console.warn(`[Supabase] upsert ${table}/${record.id}:`, e.message);
    }
  }

  async _deleteRecord(table, id) {
    if (!this.client) return;
    try {
      await this.client
        .from('records')
        .delete()
        .eq('id', id)
        .eq('table', table);
    } catch (e) {
      console.warn(`[Supabase] delete ${table}/${id}:`, e.message);
    }
  }

  put(table, record) {
    const id = record.id || nanoid(12);
    const now = new Date().toISOString();
    const existing = this._table(table).get(id);
    const saved = {
      ...record,
      id,
      createdAt: record.createdAt || existing?.createdAt || now,
      updatedAt: now,
      tgRef: existing?.tgRef || {
        channel: `db_${table}`,
        messageId: Math.floor(100000 + Math.random() * 900000),
      },
    };
    this._saveLocal(table, saved);
    this._upsert(table, saved).catch(() => {});
    return saved;
  }

  get(table, id) {
    return this._table(table).get(id) || null;
  }

  query(table, fn = () => true) {
    return [...this._table(table).values()].filter(fn);
  }

  find(table, fn) {
    return this.query(table, fn)[0] || null;
  }

  delete(table, id) {
    const ok = this._table(table).delete(id);
    this._deleteRecord(table, id).catch(() => {});
    return ok;
  }

  count(table, fn) {
    return this.query(table, fn).length;
  }
}
