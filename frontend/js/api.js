// Open Store — client state, REST client, polling (no WebSocket).

const _cfg = window.APP_CONFIG || {};
const API_BASE = _cfg.API_URL
  ? _cfg.API_URL.replace(/\/+$/, "") + "/api/v1"
  : location.protocol === "file:"
    ? "http://localhost:3001/api/v1"
    : location.origin + "/api/v1";

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
  mock: false,
  unread: { chat: 0, notif: 0 },
  _pollTimers: [],
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
  if (u.startsWith("http")) return u;
  const base = _cfg.API_URL
    ? _cfg.API_URL.replace(/\/+$/, "")
    : location.protocol === "file:"
      ? "http://localhost:3001"
      : location.origin;
  return base + u;
}

// ---- Polling (replaces WebSocket) ------------------------------------------
function startPolling() {
  if (state.mock || !state.token) return;
  stopPolling();
  // Presence ping every 25s
  state._pollTimers.push(
    setInterval(() => api.post("/ping").catch(() => {}), 25000),
  );
  // Initial ping
  api.post("/ping").catch(() => {});
  // Notifications poll every 10s
  state._pollTimers.push(
    setInterval(() => pollNotifications(), 10000),
  );
  // Messages poll every 3s (only when in a conversation)
  state._pollTimers.push(
    setInterval(() => pollMessages(), 3000),
  );
  // Presence poll every 30s
  state._pollTimers.push(
    setInterval(() => pollPresence(), 30000),
  );
}
function stopPolling() {
  state._pollTimers.forEach(clearInterval);
  state._pollTimers = [];
}

// Poll for new messages in the currently open conversation
async function pollMessages() {
  if (!state.openConvo || state.mock) return;
  try {
    const after = state._lastMsgTime || "";
    const d = await api.get(
      "/poll/messages?conversationId=" +
        state.openConvo +
        (after ? "&after=" + encodeURIComponent(after) : ""),
    );
    if (d.messages && d.messages.length > 0) {
      const box = document.getElementById("messages");
      let hasNew = false;
      for (const m of d.messages) {
        if (box && !box.querySelector(`.msg-line[data-id="${m.id}"]`)) {
          const e = box.querySelector(".empty");
          if (e) e.remove();
          box.insertAdjacentHTML("beforeend", bubble(m));
          hasNew = true;
          // Update last message time for next poll
          if (!state._lastMsgTime || m.createdAt > state._lastMsgTime)
            state._lastMsgTime = m.createdAt;
          // Auto-read if not from self
          if (m.senderId !== state.me.id) {
            api.post("/conversations/" + state.openConvo + "/read").catch(() => {});
          }
          // Update chat list item
          updateChatListItem(m.conversationId, m.text, m.createdAt);
        }
      }
      if (hasNew) scrollMessages();
    }
  } catch {}
}

// Poll for new notifications
async function pollNotifications() {
  if (state.mock) return;
  try {
    const after = state._lastNotifTime || "";
    const d = await api.get(
      "/poll/notifications" + (after ? "?after=" + encodeURIComponent(after) : ""),
    );
    if (d.unread > state.unread.notif) {
      state.unread.notif = d.unread;
      refreshBadges();
    }
    if (d.notifications && d.notifications.length > 0) {
      const newest = d.notifications[0];
      if (!state._lastNotifTime || newest.createdAt > state._lastNotifTime)
        state._lastNotifTime = newest.createdAt;
    }
  } catch {}
}

// Poll for online presence
async function pollPresence() {
  if (state.mock || !state.openConvo) return;
  try {
    const convo = state._convoMembers;
    if (!convo || convo.length === 0) return;
    const ids = convo.map((m) => m.id).join(",");
    const d = await api.get("/poll/presence?userIds=" + encodeURIComponent(ids));
    const line = document.getElementById("presence-line");
    if (line) {
      const online = Object.values(d.presence || {}).some(Boolean);
      line.textContent = online ? "online" : "offline";
    }
  } catch {}
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
}
async function signup(handle, name, password) {
  const d = await api.post("/auth/signup", { handle, name, password });
  state.token = d.token;
  localStorage.setItem("os_token", d.token);
  state.me = d.user;
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
