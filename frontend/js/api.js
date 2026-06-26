// Open Store — client state, REST client, WebSocket, and offline mock fallback.

const API_BASE =
  location.protocol === "file:"
    ? "http://localhost:3001/api/v1"
    : location.origin + "/api/v1";
const WS_BASE =
  location.protocol === "file:"
    ? "ws://localhost:3001/ws"
    : (location.protocol === "https:" ? "wss://" : "ws://") +
      location.host +
      "/ws";

const state = {
  token: localStorage.getItem("os_token") || null,
  me: null,
  feedPrefs: {
    recency: 0.6,
    popularity: 0.5,
    following: 0.7,
    depth: 0.5,
    provenance: "all",
  },
  route: { name: "feed", params: {} },
  theme: localStorage.getItem("os_theme") || "dark",
  ws: null,
  wsHandlers: {},
  mock: false,
  unread: { chat: 0, notif: 0 },
};

// ---- REST ------------------------------------------------------------------
async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers.Authorization = "Bearer " + state.token;
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw Object.assign(new Error(data?.error?.message || "Request failed"), {
      data,
      status: res.status,
    });
  return data;
}
const api = {
  get: (p) => req("GET", p),
  post: (p, b) => req("POST", p, b),
  put: (p, b) => req("PUT", p, b),
  patch: (p, b) => req("PATCH", p, b),
};

// Upload a real binary file (video/image) → { fileId, url, contentType }.
async function uploadFile(file) {
  const res = await fetch(API_BASE + "/media", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      Authorization: "Bearer " + state.token,
    },
    body: file,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d?.error?.message || "Upload failed");
  return d;
}
// Resolve a server media path to an absolute URL (handles file:// preview).
function mediaSrc(u) {
  if (!u) return "";
  return u.startsWith("/")
    ? (location.protocol === "file:" ? "http://localhost:3001" : "") + u
    : u;
}

// ---- WebSocket -------------------------------------------------------------
function connectWS() {
  if (state.mock || !state.token) return;
  try {
    const ws = new WebSocket(
      WS_BASE + "?token=" + encodeURIComponent(state.token),
    );
    state.ws = ws;
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      (state.wsHandlers[msg.type] || []).forEach((fn) => fn(msg.payload));
    };
    ws.onclose = () => {
      state.ws = null;
      if (!state.mock) setTimeout(connectWS, 2500);
    };
    ws.onerror = () => {};
    setInterval(() => {
      if (ws.readyState === 1)
        ws.send(JSON.stringify({ type: "presence:ping" }));
    }, 25000);
  } catch {
    /* ignore */
  }
}
function wsOn(type, fn) {
  (state.wsHandlers[type] ||= []).push(fn);
}
function wsSend(type, payload) {
  if (state.ws && state.ws.readyState === 1)
    state.ws.send(JSON.stringify({ type, payload }));
}

// ---- Boot / auth -----------------------------------------------------------
// Returns 'ok' (session valid), 'auth' (need to sign in/up), or 'offline' (server unreachable).
async function boot() {
  document.documentElement.setAttribute("data-theme", state.theme);
  if (!state.token) return "auth";
  try {
    const me = await api.get("/auth/me");
    state.me = me.user;
    state.feedPrefs = me.feedPrefs || state.feedPrefs;
    connectWS();
    return "ok";
  } catch (e) {
    if (e.status === 401) {
      localStorage.removeItem("os_token");
      state.token = null;
      return "auth";
    }
    console.warn("Open Store: backend unreachable.", e?.message);
    return "offline";
  }
}

async function login(handle, password) {
  const d = await api.post("/auth/login", { handle, password });
  state.token = d.token;
  localStorage.setItem("os_token", d.token);
  state.me = d.user;
  connectWS();
}
async function signup(handle, name, password) {
  const d = await api.post("/auth/signup", { handle, name, password });
  state.token = d.token;
  localStorage.setItem("os_token", d.token);
  state.me = d.user;
  connectWS();
}

// ---- Data helpers — all real, straight from the API ------------------------
const data = {
  feed: (prefs) =>
    api.get("/feed?" + new URLSearchParams(flatPrefs(prefs)).toString()),
  videos: () => api.get("/videos"),
  video: (id) => api.get("/videos/" + id),
  shorts: () => api.get("/shorts/feed"),
  conversations: () => api.get("/conversations"),
  messages: (id) => api.get("/conversations/" + id + "/messages"),
  connections: () => api.get("/connections"),
  notifications: () => api.get("/notifications"),
  profile: (handle) => api.get("/users/" + handle),
  explore: (q, type) =>
    api.get(
      "/explore?" + new URLSearchParams({ q: q || "", type: type || "all" }),
    ),
  trending: () => api.get("/trending"),
  bookmarks: () => api.get("/bookmarks"),
};
function flatPrefs(p) {
  const o = {};
  ["recency", "popularity", "following", "depth"].forEach((k) => (o[k] = p[k]));
  o.provenance = p.provenance;
  return o;
}
