// Vercel serverless wrapper for the Express backend.
// NOTE: Vercel serverless has limitations:
//   - No WebSocket support (chat won't work)
//   - File system is ephemeral (db.json resets on cold start)
//   - 10s timeout on hobby plan
// For production, use Railway/Render/Fly.io instead.

let app;

async function init() {
  if (app) return app;
  const mod = await import("../src/index.js");
  app = mod.default || mod.app;
  return app;
}

export default async function handler(req, res) {
  const expressApp = await init();
  return expressApp(req, res);
}
