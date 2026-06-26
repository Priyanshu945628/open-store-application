// Open Store — Telegram Bot API client
// Per BACKEND.md §4: Telegram is the durable store; this is the bridge.
// Uses the HTTPS Bot API — no extra npm packages (Node 18+ has fetch built-in).
//
// Quick setup:
//   1. Message @BotFather → /newbot → copy your bot token.
//   2. Create a PRIVATE Telegram channel for DB records (channels-as-tables).
//   3. Optionally create a second PRIVATE channel for media blobs.
//   4. Add your bot as Admin (with "Post Messages" permission) in each channel.
//   5. Get each channel's numeric ID (forward a msg to @userinfobot, or /getUpdates).
//   6. Copy server/.env.example → server/.env and fill in the values.

const TG_BASE = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
const MAX_TEXT = 4000; // Telegram limit is 4096; leave a safe margin

export class TelegramClient {
  constructor(token) {
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
    this.token = token;
    this.isLocal = TG_BASE !== 'https://api.telegram.org';
  }

  // ── Core ────────────────────────────────────────────────────────────────────

  /** Bot API call with FLOOD_WAIT retry + exponential backoff for 5xx. */
  async call(method, params = {}, attempt = 0) {
    const res = await fetch(`${TG_BASE}/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const d = await res.json();
    if (d.ok) return d.result;

    if (d.parameters?.retry_after) {
      const ms = (d.parameters.retry_after + 1) * 1000;
      console.warn(`[TG] FLOOD_WAIT ${d.parameters.retry_after}s on ${method} — retrying`);
      await sleep(ms);
      return this.call(method, params, attempt + 1);
    }
    if (attempt < 3 && res.status >= 500) {
      await sleep(1000 * 2 ** attempt);
      return this.call(method, params, attempt + 1);
    }
    throw new Error(`[TG] ${method}: ${d.description}`);
  }

  // ── Structured record helpers (channels-as-tables) ─────────────────────────

  /**
   * Write a JSON record to a channel message.
   * Small records → plain text (searchable in Telegram).
   * Large records → JSON document attachment.
   * Returns { messageId }.
   */
  async sendRecord(chatId, data) {
    const text = JSON.stringify(data);
    if (text.length <= MAX_TEXT) {
      const msg = await this.call('sendMessage', {
        chat_id: chatId, text,
        disable_notification: true,
        disable_web_page_preview: true,
      });
      return { messageId: msg.message_id };
    }
    const messageId = await this._sendDoc(
      chatId, Buffer.from(text), 'record.json', 'application/json'
    );
    return { messageId };
  }

  /**
   * Update an existing record message.
   * Silently ignores "message is not modified" (idempotent).
   */
  async editRecord(chatId, messageId, data) {
    const text = JSON.stringify(data);
    if (text.length > MAX_TEXT) {
      console.warn(`[TG] editRecord: payload too large for inline edit (msgId=${messageId})`);
      return; // index is still correct — TG is just a backup
    }
    try {
      await this.call('editMessageText', {
        chat_id: chatId, message_id: messageId, text, disable_web_page_preview: true,
      });
    } catch (e) {
      if (!e.message.includes('not modified')) throw e;
    }
  }

  /** Delete a record message. Silently ignores "message to delete not found". */
  async deleteRecord(chatId, messageId) {
    try {
      await this.call('deleteMessage', { chat_id: chatId, message_id: messageId });
    } catch (e) {
      if (!e.message.includes('to delete not found')) {
        console.warn('[TG] deleteRecord:', e.message);
      }
    }
  }

  // ── Media helpers ──────────────────────────────────────────────────────────

  /**
   * Upload a binary buffer to a Telegram channel (media store).
   * Returns Telegram's durable file_id.
   */
  async sendFile(chatId, buffer, filename, mimeType = 'application/octet-stream') {
    return this._sendDoc(chatId, buffer, filename, mimeType, true);
  }

  /**
   * Get a temporary HTTPS URL to download a file (~1 hour expiry).
   * Always call this immediately before downloading; URLs expire.
   */
  async getFileUrl(tgFileId) {
    const f = await this.call('getFile', { file_id: tgFileId });
    return `${TG_BASE}/file/bot${this.token}/${f.file_path}`;
  }

  /** Download a Telegram file into a Buffer. */
  async downloadFile(tgFileId) {
    const url = await this.getFileUrl(tgFileId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[TG] download failed: ${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  /** Verify the bot token is valid. Returns the bot User object. */
  async getMe() { return this.call('getMe'); }

  // ── Internal ───────────────────────────────────────────────────────────────

  async _sendDoc(chatId, buffer, filename, mimeType, returnFileId = false) {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('document', new Blob([buffer], { type: mimeType }), filename);
    form.append('disable_notification', 'true');
    const res = await fetch(`${TG_BASE}/bot${this.token}/sendDocument`, {
      method: 'POST', body: form,
    });
    const d = await res.json();
    if (!d.ok) throw new Error(`[TG] sendDocument: ${d.description}`);
    return returnFileId ? d.result.document.file_id : d.result.message_id;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
