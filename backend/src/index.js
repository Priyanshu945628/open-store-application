// Open Store — Server bootstrap
// Express REST API + polling, serving the glass web app from ../frontend.
// Run: `npm install && npm run dev`  →  http://localhost:3001

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

import { db, tgClient, tgConfig } from "./store.js";
import { api } from "./api.js";
// realtime.js exports are no-ops in polling mode (no WebSocket server)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

console.log(
  `Loaded ${db.count("users")} users, ${db.count("posts")} posts from disk.`,
);
const storageMode =
  process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_DB_CHAT
    ? "Telegram write-through + local JSON index"
    : "in-memory (local JSON file)";
console.log(`  Storage: ${storageMode}`);

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Always allow all Vercel frontend(s)
allowedOrigins.push("https://open-store-five.vercel.app");
allowedOrigins.push("https://open-store-two.vercel.app");
allowedOrigins.push("https://open-store.vercel.app");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    if (origin.endsWith(".vercel.app")) return cb(null, true);
    cb(null, allowedOrigins.length ? false : true);
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

// Health + version
app.get("/api/v1/health", (_req, res) =>
  res.json({ ok: true, name: "Open Store", version: "1.0.0" }),
);

// Telegram channel diagnostic
app.get("/api/v1/tg-status", async (_req, res) => {
  if (!tgClient) return res.json({ active: false, reason: "No bot token configured" });
  const result = { active: true, bot: null, channels: {} };
  try {
    const me = await tgClient.getMe();
    result.bot = "@" + me.username;
  } catch (e) {
    return res.json({ active: false, error: e.message });
  }
  for (const [label, cid] of [["db", tgConfig.dbChat], ["media", tgConfig.mediaChat]]) {
    try {
      const info = await tgClient.call("getChat", { chat_id: cid });
      const perms = await tgClient.call("getChatMember", { chat_id: cid, user_id: result.bot.replace("@", "") }).catch(() => null);
      result.channels[label] = { id: cid, title: info.title, accessible: true, botAdmin: perms?.status === "creator" || perms?.status === "administrator" };
    } catch (e) {
      result.channels[label] = { id: cid, accessible: false, error: e.message };
    }
  }
  res.json(result);
});

// REST API (versioned)
app.use("/api/v1", api);

// Consistent error shape for anything that throws.
app.use((errr, _req, res, _next) => {
  console.error(errr);
  res
    .status(500)
    .json({
      error: { code: "server_error", message: "Something went wrong." },
    });
});

// Serve the frontend (single responsive web app) and SPA-fallback to index.html.
const appDir = path.join(__dirname, "..", "..", "frontend");
if (fs.existsSync(appDir)) {
  app.use(express.static(appDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(appDir, "index.html"));
  });
}

// ── Export app for Vercel serverless ──────────────────────────────────────────
export { app };

// ── Start server (skip in Vercel serverless) ─────────────────────────────────
if (!process.env.VERCEL) {
  const server = http.createServer(app);

  // Scheduled-message dispatcher — fires due scheduled messages.
  setInterval(() => {
    const now = Date.now();
    for (const m of db.query(
      "messages",
      (x) => x.scheduled && x.sendAt && new Date(x.sendAt).getTime() <= now,
    )) {
      const sent = db.put("messages", {
        ...m,
        scheduled: false,
        sendAt: null,
        status: "sent",
        createdAt: new Date().toISOString(),
      });
      const c = db.get("conversations", m.conversationId);
      if (c) db.put("conversations", { ...c, lastMessageAt: sent.createdAt });
    }
  }, 5000).unref?.();

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.error(
        `\n  ⚠  Port ${PORT} is already in use — another Open Store server is still running.`,
      );
      console.error(`     Stop it first, e.g.  (Windows)  npx kill-port ${PORT}`);
      console.error(
        `     or set a different port:  set PORT=3002 && npm run dev\n`,
      );
      process.exit(1);
    } else {
      console.error(e);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`\n  Open Store running → http://localhost:${PORT}`);
    console.log(`  REST   /api/v1   ·   Polling mode (no WebSocket)`);
    console.log(`  Create a real account from the sign-up screen.\n`);
  });
}
