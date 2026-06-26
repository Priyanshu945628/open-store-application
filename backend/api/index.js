// Vercel serverless wrapper — handles CORS + Express routing

const allowedOrigins = [
  "https://open-store-five.vercel.app",
  "https://open-store-two.vercel.app",
  "https://open-store.vercel.app",
];

function setCors(res, origin) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return;
  }
  if (allowedOrigins.some(o => origin.startsWith(o)) || origin.endsWith(".vercel.app")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
  }
}

let app;

async function init() {
  if (app) return app;
  const mod = await import("../src/index.js");
  app = mod.default || mod.app;
  return app;
}

export default async function handler(req, res) {
  // Set CORS headers on EVERY response
  const origin = req.headers?.origin || "";
  setCors(res, origin);

  // Handle preflight OPTIONS immediately
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(200).end();
  }

  try {
    const expressApp = await init();
    return expressApp(req, res);
  } catch (e) {
    console.error("Serverless error:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "server_error", message: "Something went wrong." } });
    }
  }
}
