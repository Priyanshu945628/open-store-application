// Open Store — small UI helpers shared across screens.

function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function gradFor(ref, fallbackHue = 240) {
  const h = ref && ref.hue != null ? ref.hue : fallbackHue;
  return `background:linear-gradient(135deg,hsl(${h} 70% 55%),hsl(${(h + 50) % 360} 75% 45%))`;
}
function avatar(user, size = 40) {
  const u = user || {};
  if (u.avatarRef?.kind === "image" && u.avatarRef?.url)
    return `<div class="avatar s${size}"><img src="${esc(u.avatarRef.url)}" style="width:100%;height:100%;object-fit:cover" alt="${esc(initials(u.name || u.handle))}"></div>`;
  return `<div class="avatar s${size}" style="${gradFor(u.avatarRef, 240)}">${esc(initials(u.name || u.handle))}</div>`;
}
function avatarWrap(user, size = 40, online = false) {
  return `<div class="avatar-wrap">${avatar(user, size)}${online ? '<span class="presence"></span>' : ""}</div>`;
}
function gradientMedia(ref, hue = 220) {
  if (ref && ref.kind === "image" && ref.url)
    return `<img class="gradient-media" style="object-fit:cover;width:100%;height:100%" src="${esc(ref.url)}" alt="">`;
  return `<div class="gradient-media" style="${gradFor(ref, hue)}"></div>`;
}

function verifiedMark(v) {
  return v
    ? `<svg class="icon verified" viewBox="0 0 24 24" style="stroke:none;fill:var(--accent)"><path d="M12 2l2.4 1.8 3 .2.9 2.9 2.3 1.9-1 2.8 1 2.8-2.3 1.9-.9 2.9-3 .2L12 22l-2.4-1.7-3-.2-.9-2.9L3.4 15.3l1-2.8-1-2.8 2.3-1.9.9-2.9 3-.2z"/><path d="M8.5 12.2l2.3 2.3 4.5-4.7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : "";
}

const ROLE_BADGE = { special: "Special", owner: "Owner", admin: "Admin" };
function roleChip(role) {
  return ROLE_BADGE[role]
    ? `<span class="badge" style="color:var(--accent)">${ROLE_BADGE[role]}</span>`
    : "";
}

function provenanceBadge(p) {
  const map = {
    real: ["real", "user", "Real"],
    ai: ["ai", "globe", "AI"],
    remixed: ["remixed", "fork", "Remixed"],
  };
  const [cls, ic, label] = map[p] || map.real;
  return `<span class="badge ${cls}">${icon(ic)}${label}</span>`;
}

function fmtCount(n) {
  n = n || 0;
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
function fmtDuration(s) {
  s = Math.round(s || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return Math.floor(d / 60) + "m";
  if (d < 86400) return Math.floor(d / 3600) + "h";
  if (d < 604800) return Math.floor(d / 86400) + "d";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Link / mention / hashtag highlighting (ALGORITHMS §9.1 / FRONTEND §9).
function linkify(text) {
  return esc(text)
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>',
    )
    .replace(
      /(^|\s)@([a-z0-9_]+)/gi,
      '$1<a class="mention" href="#/u/$2">@$2</a>',
    )
    .replace(
      /(^|\s)#([a-z0-9_]+)/gi,
      '$1<a class="hashtag" href="#/explore?q=$2">#$2</a>',
    );
}

// Toasts
function toast(msg, kind = "default") {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast glass-strong";
  if (kind === "success") el.style.color = "var(--success)";
  if (kind === "error") el.style.color = "var(--danger)";
  el.innerHTML = esc(msg);
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s";
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

// Modal / overlay
function openOverlay(html, cls = "modal") {
  const overlay = document.createElement("div");
  overlay.className = cls === "panel" ? "panel-overlay" : "modal-overlay";
  overlay.innerHTML = `<div class="${cls} glass-strong" role="dialog" aria-modal="true">${html}</div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
  return overlay;
}
function closeOverlays() {
  document
    .querySelectorAll(".modal-overlay,.panel-overlay")
    .forEach((o) => o.remove());
}
