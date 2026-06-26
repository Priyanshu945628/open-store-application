// Open Store — app shell, router, and all screens.

const root = document.getElementById("root");

// ---- Router ----------------------------------------------------------------
function parseRoute() {
  const raw = (location.hash || "#/").slice(1);
  const [path, qs] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ""));
  if (parts.length === 0) return { name: "feed", params };
  const [a, b] = parts;
  if (a === "videos" && b) return { name: "video", params: { id: b } };
  if (a === "videos") return { name: "videos", params };
  if (a === "shorts") return { name: "shorts", params };
  if (a === "chat") return { name: "chat", params: { id: b || null } };
  if (a === "u") return { name: "profile", params: { handle: b } };
  if (a === "explore") return { name: "explore", params };
  if (a === "notifications") return { name: "notifications", params };
  if (a === "connections") return { name: "connections", params };
  if (a === "settings") return { name: "settings", params };
  if (a === "saved") return { name: "saved", params };
  if (a === "admin") return { name: "admin", params };
  return { name: "feed", params };
}
function go(hash) {
  location.hash = hash;
}

// ---- Navigation model ------------------------------------------------------
function navItems() {
  const h = state.me?.handle || "you";
  return [
    { key: "feed", icon: "home", label: "Home", href: "#/" },
    { key: "videos", icon: "video", label: "Videos", href: "#/videos" },
    { key: "shorts", icon: "shorts", label: "Shorts", href: "#/shorts" },
    {
      key: "chat",
      icon: "chat",
      label: "Chat",
      href: "#/chat",
      badge: () => state.unread.chat,
    },
    { key: "profile", icon: "user", label: "Profile", href: "#/u/" + h },
  ];
}
const isActive = (key) =>
  state.route.name === key ||
  (key === "profile" && state.route.name === "profile") ||
  (key === "videos" && state.route.name === "video");

function sidebarHTML() {
  const items = navItems()
    .map(
      (n) =>
        `<a href="${n.href}" class="${isActive(n.key) ? "active" : ""}">${icon(n.icon)}<span>${n.label}</span>${n.badge && n.badge() ? `<span class="nav-badge">${n.badge()}</span>` : ""}</a>`,
    )
    .join("");
  return `<aside class="sidebar glass">
    <div class="brand"><span class="brand-mark">${icon("globe", "icon sm")}</span> Open Store</div>
    ${items}
    <a href="#/notifications" class="${isActive("notifications") ? "active" : ""}">${icon("bell")}<span>Notifications</span>${state.unread.notif ? `<span class="nav-badge">${state.unread.notif}</span>` : ""}</a>
    <a href="#/explore" class="${isActive("explore") ? "active" : ""}">${icon("search")}<span>Explore</span></a>
    <a href="#/connections" class="${isActive("connections") ? "active" : ""}">${icon("users")}<span>Connections</span></a>
    <a href="#/settings" class="${isActive("settings") ? "active" : ""}">${icon("settings")}<span>Settings</span></a>
    ${["owner", "admin"].includes(state.me?.role) ? `<a href="#/admin" class="${isActive("admin") ? "active" : ""}" style="color:var(--warn)">${icon("shield")}<span>Admin</span></a>` : ""}
    <button class="btn btn-primary" onclick="openComposer()">${icon("plus")} Create</button>
    <a href="#/u/${state.me?.handle}" class="me row" style="margin-top:auto">${avatar(state.me, 40)}<div><div class="name">${esc(state.me?.name || "")}</div><div class="handle">@${esc(state.me?.handle || "")}</div></div></a>
  </aside>`;
}
function railHTML() {
  const items = navItems()
    .map(
      (n) =>
        `<a href="${n.href}" class="${isActive(n.key) ? "active" : ""}" title="${n.label}">${icon(n.icon)}${n.badge && n.badge() ? `<span class="nav-badge">${n.badge()}</span>` : ""}</a>`,
    )
    .join("");
  return `<nav class="rail glass">
    <span class="brand-mark">${icon("globe", "icon sm")}</span>
    ${items}
    <a href="#/notifications" class="${isActive("notifications") ? "active" : ""}" title="Notifications">${icon("bell")}${state.unread.notif ? `<span class="nav-badge">${state.unread.notif}</span>` : ""}</a>
    <a href="#/explore" class="${isActive("explore") ? "active" : ""}" title="Explore">${icon("search")}</a>
    <button class="create" onclick="openComposer()" title="Create">${icon("plus")}</button>
  </nav>`;
}
function bottomNavHTML() {
  const items = navItems()
    .map(
      (n) =>
        `<a href="${n.href}" class="${isActive(n.key) ? "active" : ""}">${icon(n.icon)}<span>${n.label}</span></a>`,
    )
    .join("");
  return `<nav class="bottomnav glass">${items}</nav>`;
}
function topbarHTML(title) {
  return `<header class="topbar glass">
    <div class="brand"><span class="brand-mark">${icon("globe", "icon sm")}</span><span class="brand-text">${esc(title || "Open Store")}</span></div>
    <div class="spacer"></div>
    <a class="btn-icon" href="#/explore" aria-label="Explore">${icon("search")}</a>
    <a class="btn-icon" href="#/notifications" style="position:relative" aria-label="Notifications">${icon("bell")}${state.unread.notif ? `<span class="nav-badge" style="position:absolute;top:6px;right:6px">${state.unread.notif}</span>` : ""}</a>
    <a class="btn-icon" href="#/settings" aria-label="Settings">${icon("settings")}</a>
  </header>`;
}
function rightPanelHTML() {
  return `<aside class="rightpanel">
    <div class="rp-card glass" id="rp-trending"><div class="section-label">Trending</div><div class="skel" style="height:120px"></div></div>
    <div class="rp-card glass" id="rp-suggested"><div class="section-label">Who to follow</div><div class="skel" style="height:120px"></div></div>
    <div class="muted" style="font-size:12px;padding:0 4px">Open Store — see into it, trust it, own it. ${state.mock ? "· offline preview" : ""}</div>
  </aside>`;
}

// ---- Shell render ----------------------------------------------------------
function renderShell(viewHTML, title) {
  root.innerHTML = `<div class="shell">
    ${sidebarHTML()}
    ${railHTML()}
    <main class="main">${topbarHTML(title)}<div id="view">${viewHTML}</div></main>
    ${rightPanelHTML()}
  </div>${bottomNavHTML()}<button class="fab" onclick="openComposer()" aria-label="Create">${icon("plus")}</button>`;
  loadRightPanel();
}
const view = () => document.getElementById("view");
const skeletonList = (n = 3) =>
  Array.from(
    { length: n },
    () =>
      `<div class="card glass"><div class="row">${`<div class="skel avatar s40"></div>`}<div style="flex:1"><div class="skel" style="height:12px;width:40%;margin-bottom:8px"></div><div class="skel" style="height:10px;width:25%"></div></div></div><div class="skel" style="height:60px;margin-top:12px"></div></div>`,
  ).join("");

async function loadRightPanel() {
  try {
    const t = await data.trending();
    const trg = document.getElementById("rp-trending");
    if (trg)
      trg.innerHTML =
        `<div class="section-label">Trending</div>` +
        (t.trending || [])
          .map(
            (x) =>
              `<a href="#/explore?q=${x.tag}" class="row" style="padding:8px 0"><span class="hashtag">#${esc(x.tag)}</span><span class="muted" style="margin-left:auto;font-size:12px">${x.hotScore}</span></a>`,
          )
          .join("");
  } catch {}
  try {
    const c = await data.connections();
    const sg = document.getElementById("rp-suggested");
    if (sg)
      sg.innerHTML =
        `<div class="section-label">Who to follow</div>` +
        (c.suggested || [])
          .slice(0, 3)
          .map(
            (u) =>
              `<div class="row" style="padding:8px 0"><a href="#/u/${u.handle}">${avatar(u, 40)}</a><div style="min-width:0;flex:1"><a href="#/u/${u.handle}" style="color:inherit;text-decoration:none"><div class="name" style="font-size:14px">${esc(u.name)} ${verifiedMark(u.verified)}</div><div class="handle">@${esc(u.handle)}</div></a></div><button class="btn btn-ghost btn-sm" onclick="follow('${u.id}',this)">Follow</button></div>`,
          )
          .join("");
  } catch {}
}

// ===========================================================================
// SCREENS
// ===========================================================================
const SCREENS = {
  async feed() {
    renderShell(
      `<div class="container"><div id="composer-inline"></div>${skeletonList(3)}</div>`,
      "Home",
    );
    renderInlineComposer();
    try {
      const { posts } = await data.feed(state.feedPrefs);
      view().querySelector(".container").innerHTML =
        `<div id="composer-inline"></div>
         <div class="row" style="justify-content:space-between;margin-bottom:12px">
           <div class="page-title" style="margin:0">Home</div>
           <button class="btn btn-ghost btn-sm" onclick="openFeedControl()">${icon("sliders", "icon sm")} Tune feed</button>
         </div>
         <div id="feed-list">${posts.map(postCard).join("") || feedEmpty()}</div>`;
      renderInlineComposer();
    } catch (e) {
      if (e.status === 401) return logout();
    }
  },

  async videos() {
    renderShell(
      `<div class="container"><div class="page-title">Videos</div>${skeletonList(2)}</div>`,
      "Videos",
    );
    const { videos } = await data.videos();
    view().querySelector(".container").innerHTML =
      `<div class="page-title">Videos</div><div class="video-grid">${videos.map(videoCard).join("")}</div>`;
  },

  async video({ id }) {
    renderShell(`<div class="container">${skeletonList(1)}</div>`, "Watch");
    const { video, upNext } = await data.video(id);
    view().querySelector(".container").innerHTML = watchPage(video, upNext);
  },

  async shorts() {
    const { shorts } = await data.shorts();
    root.innerHTML = `<div class="shorts-stage">
      <button class="btn-icon shorts-close glass" onclick="go('#/')">${icon("back")}</button>
      <div class="shorts-track" id="shorts-track">${shorts.map(shortSlide).join("") || `<div class="empty" style="color:#fff">${icon("shorts")}<div>No shorts yet — create one</div></div>`}</div>
    </div>${bottomNavHTML()}`;
    const vids = [...document.querySelectorAll(".short-media-el")];
    if (!vids.length) return;
    vids[0].play?.().catch(() => {});
    vids.forEach((v) => {
      const bar = v.closest(".short")?.querySelector(".short-progress > i");
      if (bar) {
        v.addEventListener("timeupdate", () => {
          if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + "%";
        });
        v.addEventListener("ended", () => { bar.style.width = "0%"; });
      }
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target;
          if (e.isIntersecting && e.intersectionRatio > 0.5) {
            v.muted = false;
            v.play?.().catch(() => {});
          } else {
            v.pause?.();
          }
        });
      },
      { threshold: [0, 0.5, 1] },
    );
    vids.forEach((v) => io.observe(v));
  },

  async chat({ id }) {
    document.body.classList.toggle("in-convo", !!id);
    const { conversations } = await data.conversations();
    state.unread.chat = conversations.reduce((a, c) => a + (c.unread || 0), 0);
    const listHTML = `<aside class="chat-list glass">
        <div class="row" style="justify-content:space-between;padding:8px 4px 12px"><div class="page-title" style="margin:0">Chats</div><button class="btn-icon" onclick="openNewChat()" title="New chat">${icon("plus")}</button></div>
        ${conversations.map((c) => chatListItem(c, id)).join("") || emptyState("No conversations yet", "chat")}
      </aside>`;
    const paneHTML = id
      ? `<section id="convo-pane" class="convo glass"></section>`
      : `<section class="convo glass desktop-only" id="convo-pane"><div class="empty">${icon("chat")}<div>Select a conversation</div></div></section>`;
    renderShell(`<div class="chat-wrap">${listHTML}${paneHTML}</div>`, "Chat");
    if (id) openConversation(id);
  },

  async profile({ handle }) {
    renderShell(
      `<div class="container">${skeletonList(1)}</div>`,
      "@" + handle,
    );
    const p = await data.profile(handle);
    window.__profile = {
      posts: p.posts || [],
      videos: p.videos,
      shorts: p.shorts,
    };
    view().querySelector(".container").innerHTML = profilePage(p);
  },

  async explore({ q }) {
    renderShell(
      `<div class="container">
      <div class="page-title">Explore</div>
      <div class="row glass" style="padding:4px 12px;border-radius:999px;margin-bottom:16px">${icon("search", "icon sm")}<input class="input" id="search-input" placeholder="Search people, posts, videos, shorts" style="border:none;background:transparent" value="${esc(q || "")}"></div>
      <div id="explore-results">${skeletonList(2)}</div>
    </div>`,
      "Explore",
    );
    const input = document.getElementById("search-input");
    let t;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => runSearch(input.value), 250);
    });
    input.focus();
    runSearch(q || "");
  },

  async notifications() {
    renderShell(
      `<div class="container"><div class="page-title">Notifications</div>${skeletonList(3)}</div>`,
      "Notifications",
    );
    const { notifications } = await data.notifications();
    if (!state.mock) {
      try {
        await api.post("/notifications/read");
      } catch {}
    }
    state.unread.notif = 0;
    view().querySelector(".container").innerHTML =
      `<div class="page-title">Notifications</div>${notifications.map(notifRow).join("") || emptyState("You’re all caught up", "bell")}`;
  },

  async connections() {
    renderShell(
      `<div class="container"><div class="page-title">Connections</div>${skeletonList(2)}</div>`,
      "Connections",
    );
    const c = await data.connections();
    view().querySelector(".container").innerHTML =
      `<div class="page-title">Connections</div>
      ${c.requests.length ? `<div class="section-label">Requests to accept</div>${c.requests.map(requestRow).join("")}` : ""}
      <div class="section-label" style="margin-top:24px">Suggested for you</div>
      ${(c.suggested || []).map((u) => userRow(u)).join("")}
      <div class="section-label" style="margin-top:24px">Following · ${c.following.length}</div>
      ${c.following.map((u) => userRow(u, false)).join("")}`;
  },

  async saved() {
    renderShell(
      `<div class="container"><div class="page-title">Saved</div>${skeletonList(2)}</div>`,
      "Saved",
    );
    try {
      const { posts, videos } = await data.bookmarks();
      const html =
        [
          videos?.length
            ? `<div class="section-label">Videos</div><div class="video-grid">${videos.map(videoCard).join("")}</div>`
            : "",
          posts?.length
            ? `<div class="section-label" style="margin-top:16px">Posts</div>${posts.map(postCard).join("")}`
            : "",
        ].join("") ||
        emptyState(
          "Nothing saved yet — tap the bookmark on any post or video",
          "bookmark",
        );
      view().querySelector(".container").innerHTML =
        `<div class="page-title">Saved</div>${html}`;
    } catch (e) {
      toast(e.message || "Could not load saved items", "error");
    }
  },

  settings() {
    const np = localStorage.getItem("os_notif") !== "off";
    const priv = !!state.me?.isPrivate;
    const toggle = (on, fn) =>
      `<button class="switch ${on ? "on" : ""}" onclick="${fn}" role="switch" aria-checked="${on}"><i></i></button>`;
    renderShell(
      `<div class="container">
      <div class="page-title">Settings</div>

      <div class="card glass">
        <div class="row"><div>${avatar(state.me, 48)}</div><div style="flex:1;min-width:0"><div class="name">${esc(state.me?.name)} ${verifiedMark(state.me?.verified)}</div><div class="handle">@${esc(state.me?.handle)} ${roleChip(state.me?.role)}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="openEditProfile()">${icon("user", "icon sm")} Edit</button></div>
      </div>

      <div class="section-label" style="margin-top:8px">Appearance</div>
      <div class="card glass">
        <div class="set-row"><div class="row"><span class="set-ic">${icon("sun", "icon sm")}</span><div><div class="name" style="font-size:14px">Theme</div><div class="muted" style="font-size:12px">Glass looks best in dark.</div></div></div>
          <div class="seg" id="theme-seg"><button class="${state.theme === "dark" ? "active" : ""}" onclick="setTheme('dark')">Dark</button><button class="${state.theme === "light" ? "active" : ""}" onclick="setTheme('light')">Light</button></div></div>
      </div>

      <div class="section-label">Notifications & privacy</div>
      <div class="card glass">
        <div class="set-row"><div class="row"><span class="set-ic">${icon("bell", "icon sm")}</span><div class="name" style="font-size:14px">Push notifications</div></div>${toggle(np, "toggleSetting('os_notif','off')")}</div>
        <div class="set-row" style="border-top:1px solid var(--border)"><div class="row"><span class="set-ic">${icon("user", "icon sm")}</span><div><div class="name" style="font-size:14px">Private account</div><div class="muted" style="font-size:12px">Approve followers manually.</div></div></div>${toggle(priv, "toggleSetting('os_private')")}</div>
      </div>

      <div class="section-label">Your data (True Ownership)</div>
      <div class="card glass">
        <div class="set-row"><div class="row"><span class="set-ic">${icon("download", "icon sm")}</span><div><div class="name" style="font-size:14px">Export my data</div><div class="muted" style="font-size:12px">All posts, chats, connections — one file.</div></div></div>
          <button class="btn btn-ghost btn-sm" onclick="exportData()">Export</button></div>
        <div class="set-row" style="border-top:1px solid var(--border)"><div class="row"><span class="set-ic" style="color:var(--danger)">${icon("x", "icon sm")}</span><div><div class="name" style="font-size:14px">Delete account</div><div class="muted" style="font-size:12px">Really removes your data.</div></div></div>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteAccount()">Delete</button></div>
      </div>

      <div class="card glass">
        <button class="btn btn-ghost" style="width:100%;color:var(--danger)" onclick="logout()">Sign out</button>
      </div>
      <div class="muted" style="font-size:12px;text-align:center;margin-top:20px">Open Store v1.0 · see into it, trust it, own it.</div>
    </div>`,
      "Settings",
    );
  },

  async admin() {
    if (!["owner", "admin"].includes(state.me?.role)) {
      go("#/");
      return toast("Access denied", "error");
    }
    renderShell(
      `<div class="container"><div class="page-title">${icon("shield", "icon sm")} Admin Panel</div>${skeletonList(3)}</div>`,
      "Admin",
    );
    let users = [],
      stats = {};
    try {
      const r = await api.get("/admin/users");
      users = r.users || [];
    } catch {}
    try {
      const r = await api.get("/admin/stats");
      stats = r;
    } catch {}
    view().querySelector(".container").innerHTML = `
      <div class="page-title">${icon("shield", "icon sm")} Admin Panel</div>
      <div class="row" style="gap:12px;margin-bottom:20px;flex-wrap:wrap">
        ${[
          ["Users", stats.users || 0, "user"],
          ["Posts", stats.posts || 0, "home"],
          ["Videos", stats.videos || 0, "video"],
          ["Reports", stats.reports || 0, "x"],
        ]
          .map(
            ([l, n, ic]) =>
              `<div class="card glass" style="flex:1;min-width:100px;text-align:center;padding:12px"><div style="font-size:24px;font-weight:700;color:var(--accent)">${n}</div><div class="muted" style="font-size:12px">${icon(ic, "icon sm")} ${l}</div></div>`,
          )
          .join("")}
      </div>
      <div class="section-label">User Management</div>
      <div class="card glass" style="margin-bottom:12px">
        <input class="input" id="admin-search" placeholder="Search users…" oninput="adminSearchUsers(this.value)" style="margin-bottom:0" autocomplete="off">
      </div>
      <div id="admin-user-list">${adminUserRows(users)}</div>`;
    setTimeout(() => document.getElementById("admin-search")?.focus(), 50);
  },
};

// ---- Component builders ----------------------------------------------------
function postCard(p) {
  const mediaRef = p.mediaRefs?.[0];
  const clickable = mediaRef?.kind === "image" && mediaRef?.url;
  const media = mediaRef
    ? `<div class="media"${clickable ? ` role="button" tabindex="0" onclick="openImageLightbox(this.dataset.url)" data-url="${esc(mediaRef.url)}" style="cursor:zoom-in"` : ""}>${gradientMedia(mediaRef, 220)}</div>`
    : "";
  const fork = p.forkedFrom
    ? `<div class="fork-chip"><a href="#/u/${p.forkedFrom.author?.handle || ""}" style="color:inherit">${icon("fork", "icon sm")} Original by <b>@${esc(p.forkedFrom.author?.handle || "original")}</b></a></div>`
    : "";
  // Lock chip — shown on protected posts
  const lockChip =
    p.forkable === false
      ? `<span class="badge" style="color:var(--warn)">${icon("lock", "icon sm")} Protected</span>`
      : "";
  return `<article class="card glass" data-post="${p.id}">
    <div class="row">
      <a href="#/u/${p.author.handle}">${avatarWrap(p.author, 40)}</a>
      <div style="flex:1;min-width:0">
        <div class="name"><a href="#/u/${p.author.handle}">${esc(p.author.name)}</a> ${verifiedMark(p.author.verified)} ${roleChip(p.author.role)}</div>
        <div class="handle">@${esc(p.author.handle)} <span class="dot"></span> ${timeAgo(p.createdAt)}</div>
      </div>
      <div class="row" style="gap:4px">${lockChip}${provenanceBadge(p.provenance)}</div>
    </div>
    <div class="post-text">${linkify(p.text)}</div>
    ${fork}
    ${media}
    ${p.why ? `<div class="why">${icon("sliders", "icon sm")} ${esc(p.why)}</div>` : ""}
    <div class="actions">
      <button class="action ${p.liked ? "liked" : ""}" onclick="like('${p.id}',this)">${icon("heart", "icon sm")} <span>${fmtCount(p.likeCount)}</span></button>
      <button class="action" onclick="openPost('${p.id}')">${icon("comment", "icon sm")} ${fmtCount(p.commentCount)}</button>
      ${p.forkable === false ? `<span class="action muted" style="cursor:default">${icon("lock", "icon sm")} Protected</span>` : `<button class="action" onclick="forkPost('${p.id}')">${icon("fork", "icon sm")} Fork</button>`}
      <button class="action" onclick="openSendToContacts('post','${p.id}')">${icon("send", "icon sm")} Send</button>
      ${p.author.id === state.me?.id ? `<button class="action" onclick="togglePostProtect('${p.id}',${p.forkable === false})" title="${p.forkable === false ? "Remove protection" : "Protect from forks"}">${icon(p.forkable === false ? "unlock" : "lock", "icon sm")}</button>` : ""}
      <button class="action spacer" onclick="toggleSave(this,'${p.id}','post')">${icon("bookmark", "icon sm")}</button>
    </div>
  </article>`;
}

function videoCard(v) {
  return `<a class="video-card" href="#/videos/${v.id}">
    <div class="video-thumb">${gradientMedia(v.thumbnailRef, 220)}<span class="dur">${fmtDuration(v.durationS)}</span><span class="play">${icon("play", "icon lg")}</span></div>
    <div class="video-meta">${avatar(v.author, 40)}<div><div class="name" style="font-size:14.5px;line-height:1.3">${esc(v.title)}</div>
      <div class="handle">${esc(v.author.name)} <span class="dot"></span> ${fmtCount(v.viewCount)} views</div>
      <div style="margin-top:6px">${provenanceBadge(v.provenance)}</div></div></div>
  </a>`;
}

function watchPage(v, upNext) {
  return `<a href="#/videos" class="btn btn-ghost btn-sm" style="margin-bottom:12px">${icon("back", "icon sm")} Videos</a>
    <div class="video-thumb" style="aspect-ratio:16/9;margin-bottom:16px;background:#000">${
      v.mediaUrl
        ? `<video controls autoplay playsinline ${v.thumbnailRef?.url ? `poster="${esc(v.thumbnailRef.url)}"` : ""} style="width:100%;height:100%;object-fit:contain;background:#000" src="${mediaSrc(v.mediaUrl)}"></video>`
        : gradientMedia(v.thumbnailRef, 220) +
          `<span class="play">${icon("play", "icon lg")}</span>`
    }</div>
    <h1 style="font-size:20px;margin:0 0 8px">${esc(v.title)}</h1>
    <div class="row" style="margin-bottom:12px"><a href="#/u/${v.author.handle}">${avatarWrap(v.author, 40)}</a><div><div class="name"><a href="#/u/${v.author.handle}" style="color:inherit;text-decoration:none">${esc(v.author.name)}</a> ${verifiedMark(v.author.verified)}</div><div class="handle">${fmtCount(v.viewCount)} views</div></div>
      <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="toggleSubscribe(this)">Subscribe</button></div>
    <div class="actions" style="border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:8px 0;margin-bottom:12px">
      <button class="action" onclick="this.classList.toggle('liked')">${icon("heart", "icon sm")} Like</button>
      <button class="action" onclick="copyLink()">${icon("share", "icon sm")} Share</button>
      <button class="action" onclick="openSendToContacts('video','${v.id}')">${icon("send", "icon sm")} Send</button>
      <button class="action" onclick="toggleSave(this,'${v.id}','video')">${icon("bookmark", "icon sm")} Save</button>
      <button class="action" onclick="forkPost('${v.id}')">${icon("fork", "icon sm")} Fork</button>
      <span class="action spacer">${provenanceBadge(v.provenance)}</span>
    </div>
    <p class="muted" style="font-size:14px">${esc(v.description || "")}</p>
    <div class="section-label" style="margin-top:24px">Up next</div>
    <div class="video-grid">${(upNext || []).map(videoCard).join("")}</div>`;
}

function shortSlide(s) {
  return `<div class="short" data-short-id="${s.id}"><div class="short-video" onclick="toggleShortPlay(this)">${
    s.mediaUrl
      ? `<video class="short-media-el" src="${mediaSrc(s.mediaUrl)}" loop muted playsinline ${s.thumbnailRef?.url ? `poster="${esc(s.thumbnailRef.url)}"` : ""} style="width:100%;height:100%;object-fit:cover"></video>`
      : gradientMedia(s.thumbnailRef, 220)
  }
    <div class="short-rail">
      <button class="action" onclick="likeShort('${s.id}',this)">${icon("heart")}<span>${fmtCount(s.likeCount)}</span></button>
      <button class="action" onclick="openShortComments('${s.id}')">${icon("comment")}<span>${fmtCount(s.commentCount)}</span></button>
      <button class="action" onclick="copyLink()">${icon("share")}<span>Share</span></button>
      <button class="action" onclick="openSendToContacts('short','${s.id}')">${icon("send")}<span>Send</span></button>
      <button class="action" onclick="forkContent('${esc(s.caption || "").replace(/'/g, "")}')">${icon("fork")}<span>Fork</span></button>
    </div>
    <div class="short-info">
      <div class="row" style="margin-bottom:8px">${provenanceBadge(s.provenance)}</div>
      <div class="row">${avatar(s.author, 28)}<a href="#/u/${s.author.handle}" class="name" style="color:#fff">@${esc(s.author.handle)}</a>
        <button class="btn btn-ghost btn-sm" onclick="follow('${s.author.id}',this)">Follow</button></div>
      ${s.caption ? `<div style="margin-top:8px;font-weight:600;font-size:15px">${esc(s.caption)}</div>` : ""}
    </div>
    <div class="short-progress"><i></i></div>
  </div></div>`;
}

function likeShort(id, btn) {
  btn.classList.toggle("liked");
  const span = btn.querySelector("span");
  const cur = parseLikeCount(span.textContent);
  const liked = btn.classList.contains("liked");
  span.textContent = fmtCount(cur + (liked ? 1 : -1));
  if (!state.mock) api.post("/shorts/" + id + "/like").catch(() => {});
}

async function openShortComments(id) {
  let comments = [];
  if (!state.mock) {
    try {
      const r = await api.get("/shorts/" + id + "/comments");
      comments = r.comments || [];
    } catch {}
  }
  openOverlay(`<div class="modal-head"><h3>Comments</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    <div id="short-comment-list" style="max-height:400px;overflow-y:auto">${comments.map((c) => `<div class="row" style="padding:8px 0;align-items:flex-start">${avatar(c.author, 28)}<div><span class="name" style="font-size:13.5px">${esc(c.author.name)}</span> <span class="muted">${linkify(c.text)}</span></div></div>`).join("") || '<div class="muted" style="font-size:13px">Be the first to comment.</div>'}</div>
    <div class="composer-bar" style="position:static;padding:8px 0 0"><input class="input" id="short-cmt-input" placeholder="Add a comment…"><button class="btn btn-primary btn-icon" onclick="submitShortComment('${id}')">${icon("send", "icon sm")}</button></div>`);
}

async function submitShortComment(id) {
  const input = document.getElementById("short-cmt-input");
  const text = input.value.trim();
  if (!text) return;
  const list = document.getElementById("short-comment-list");
  list.insertAdjacentHTML("beforeend", `<div class="row" style="padding:8px 0;align-items:flex-start">${avatar(state.me, 28)}<div><span class="name" style="font-size:13.5px">${esc(state.me.name)}</span> <span class="muted">${linkify(text)}</span></div></div>`);
  input.value = "";
  if (!state.mock) api.post("/shorts/" + id + "/comment", { text }).catch(() => {});
}

function chatListItem(c, activeId) {
  return `<div class="chat-item ${c.id === activeId ? "active" : ""}" onclick="go('#/chat/${c.id}')">
    ${avatarWrap(c, 40, c.online)}
    <div class="meta"><div class="row" style="justify-content:space-between"><span class="name" style="font-size:14.5px">${esc(c.title)}</span><span class="time">${c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ""}</span></div>
    <div class="row" style="justify-content:space-between"><span class="last">${esc(c.lastMessage?.text || "No messages yet")}</span>${c.unread ? `<span class="unread-pill">${c.unread}</span>` : ""}</div></div>
  </div>`;
}

function notifRow(n) {
  const who = n.from ? `<b>${esc(n.from.name)}</b>` : "Someone";
  const text =
    {
      request: `${who} requested to follow you`,
      follow: `${who} started following you`,
      invite: `${who} invited you to a group`,
      like: `${who} liked your post`,
      comment: `${who} commented on your post`,
      fork: `${who} forked your post`,
      video_ready: `Your video is live`,
    }[n.type] || `${who} interacted with you`;
  let action = "";
  if (n.type === "request")
    action = `<div class="req-actions"><button class="btn btn-primary btn-sm" onclick="acceptRequestByUser('${n.from?.id}',this)">Accept</button></div>`;
  if (n.type === "invite")
    action = `<div class="req-actions"><button class="btn btn-primary btn-sm" onclick="acceptInvite('${n.payload?.inviteId || ""}',this)">Join</button></div>`;
  return `<div class="notif ${n.read ? "" : "unread"} glass">${n.from ? avatar(n.from, 40) : icon("bell")}
    <div class="grow"><div>${text}</div>${n.payload?.postText ? `<div class="muted" style="font-size:13px">“${esc(n.payload.postText)}”</div>` : ""}<div class="handle">${timeAgo(n.createdAt)}</div></div>${action}</div>`;
}

function requestRow(r) {
  return `<div class="notif glass">${avatar(r.from, 40)}<div class="grow"><div class="name">${esc(r.from.name)} ${verifiedMark(r.from.verified)}</div><div class="handle">@${esc(r.from.handle)} <span class="dot"></span> ${timeAgo(r.createdAt)}</div></div>
    <div class="req-actions"><button class="btn btn-primary btn-sm" onclick="acceptRequest('${r.requestId}',this)">Accept</button><button class="btn btn-ghost btn-sm" onclick="declineRequest('${r.requestId}',this)">Decline</button></div></div>`;
}

function userRow(u, showFollow = true) {
  return `<div class="notif glass"><a href="#/u/${u.handle}">${avatar(u, 40)}</a><div class="grow"><a href="#/u/${u.handle}" style="color:inherit;text-decoration:none"><div class="name">${esc(u.name)} ${verifiedMark(u.verified)} ${roleChip(u.role)}</div><div class="handle">@${esc(u.handle)}</div></a></div>
    ${showFollow ? `<button class="btn btn-ghost btn-sm" onclick="follow('${u.id}',this)">Follow</button>` : `<button class="btn btn-ghost btn-sm" onclick="startChat('${u.id}')">Message</button>`}</div>`;
}

function profilePage(p) {
  const u = p.user;
  const heat = (p.activity || [])
    .map(
      (c) =>
        `<span class="heat ${c >= 3 ? "l3" : c === 2 ? "l2" : c === 1 ? "l1" : ""}"></span>`,
    )
    .join("");
  const me = u.id === state.me?.id;
  const header = `<div class="profile-banner">${gradientMedia(u.bannerRef, (u.avatarRef?.hue || 240) + 40)}</div>
    <div class="profile-head">
      <div class="row" style="align-items:flex-end;justify-content:space-between">
        ${avatarWrap(u, 88, p.online)}
        <div class="row" style="gap:8px">
          ${
            me
              ? `<button class="btn btn-ghost" onclick="openEditProfile()">Edit profile</button>`
              : `<button class="btn btn-ghost" onclick="startChat('${u.id}')">Message</button><button class="btn btn-primary" onclick="follow('${u.id}',this)">${p.isFollowing ? "Following" : "Follow"}</button>`
          }
        </div>
      </div>
      <div style="margin-top:8px"><span class="name" style="font-size:20px">${esc(u.name)}</span> ${verifiedMark(u.verified)} ${roleChip(u.role)}</div>
      <div class="handle">@${esc(u.handle)}</div>
      <div style="margin-top:8px">${esc(u.bio || "")}</div>
      <div class="stats"><span><b>${fmtCount(u.stats.followers)}</b> <span>followers</span></span><span><b>${fmtCount(u.stats.following)}</b> <span>following</span></span><span><b>${fmtCount(u.stats.posts)}</b> <span>posts</span></span></div>
      <div class="section-label" style="margin-top:8px">Activity</div>
      <div class="heatmap">${heat}</div>
    </div>`;
  if (p.locked) {
    return (
      header +
      `<div class="empty" style="margin-top:24px">${icon("user")}<div style="font-weight:600;margin-bottom:6px">This account is private</div><div>Follow to see their posts and videos.</div></div>`
    );
  }
  return (
    header +
    `<div class="tabs" id="profile-tabs">
      <button class="active" data-tab="posts">Posts</button><button data-tab="videos">Videos</button><button data-tab="shorts">Shorts</button>${me ? `<button data-tab="saved">${icon("bookmark", "icon sm")} Saved</button>` : ""}
    </div>
    <div id="profile-content">${(p.posts || []).map(postCard).join("") || emptyState("No posts yet", "home")}</div>`
  );
}

function emptyState(text, ic = "home") {
  return `<div class="empty">${icon(ic)}<div>${esc(text)}</div></div>`;
}
function feedEmpty() {
  return `<div class="empty">${icon("home")}
    <div style="font-size:16px;color:var(--text);font-weight:600;margin-bottom:6px">Your feed is empty</div>
    <div style="margin-bottom:16px">Post something, or find people to follow.</div>
    <div class="row" style="justify-content:center;gap:8px">
      <button class="btn btn-primary" onclick="openComposer()">${icon("plus", "icon sm")} Create a post</button>
      <a class="btn btn-ghost" href="#/explore">${icon("search", "icon sm")} Find people</a>
    </div></div>`;
}

// ---- Inline composer (feed top) -------------------------------------------
function renderInlineComposer() {
  const el = document.getElementById("composer-inline");
  if (!el) return;
  state.inlineImage = null;
  el.innerHTML = `<div class="card glass composer">
    ${avatar(state.me, 40)}
    <div class="grow"><textarea class="input" id="inline-post" placeholder="Share something real…" rows="1" oninput="autoGrow(this)"></textarea>
      <div id="inline-preview"></div>
      <div class="composer-tools">
        <div class="seg" id="inline-prov">
          <button class="active" data-v="real">Real</button><button data-v="ai">AI</button><button data-v="remixed">Remixed</button>
        </div>
        <button class="btn btn-ghost btn-sm" title="Add photo" onclick="pickImage('inline')">${icon("image", "icon sm")} Photo</button>
        <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="submitInlinePost()">${icon("send", "icon sm")} Post</button>
      </div>
    </div>
  </div>`;
  segWire("inline-prov");
}
function autoGrow(t) {
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 200) + "px";
}
function segWire(id) {
  const seg = document.getElementById(id);
  if (!seg) return;
  seg.querySelectorAll("button").forEach(
    (b) =>
      (b.onclick = () => {
        seg
          .querySelectorAll("button")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        seg.dataset.value = b.dataset.v;
      }),
  );
  seg.dataset.value = seg.querySelector(".active")?.dataset.v || "real";
}

async function submitInlinePost() {
  const ta = document.getElementById("inline-post");
  const text = ta.value.trim();
  if (!text && !state.inlineImage)
    return toast("Write something or add a photo");
  const provenance =
    document.getElementById("inline-prov").dataset.value || "real";
  await createPost(text, provenance, null, state.inlineImage);
  ta.value = "";
  state.inlineImage = null;
  const pv = document.getElementById("inline-preview");
  if (pv) pv.innerHTML = "";
  autoGrow(ta);
}

// Real image picker → downscaled data URL, with a live preview chip.
function pickImage(target) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280,
          scale = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const url = cv.toDataURL("image/jpeg", 0.82);
        const previewHTML = `<div class="media" style="margin-top:8px;position:relative"><img class="gradient-media" style="object-fit:cover;width:100%;height:100%" src="${url}"><button class="btn-icon glass" style="position:absolute;top:8px;right:8px" onclick="clearImage('${target}')">${icon("x", "icon sm")}</button></div>`;
        if (target === "inline") {
          state.inlineImage = url;
          document.getElementById("inline-preview").innerHTML = previewHTML;
        } else {
          state.modalImage = url;
          document.getElementById("compose-preview").innerHTML = previewHTML;
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}
function clearImage(target) {
  if (target === "inline") {
    state.inlineImage = null;
    document.getElementById("inline-preview").innerHTML = "";
  } else {
    state.modalImage = null;
    document.getElementById("compose-preview").innerHTML = "";
  }
}

// Full-screen image lightbox (click outside or Esc to close)
function openImageLightbox(url) {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.92);display:grid;place-items:center;cursor:zoom-out;padding:12px";
  ov.innerHTML = `<img src="${esc(url)}" style="max-width:100%;max-height:90vh;border-radius:8px;object-fit:contain" alt="">`;
  ov.addEventListener("click", () => ov.remove());
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") ov.remove();
    },
    { once: true },
  );
  document.body.appendChild(ov);
}

// ===========================================================================
// ACTIONS
// ===========================================================================
async function createPost(text, provenance, hue, mediaDataUrl) {
  if (state.mock) {
    toast("Posted (offline preview)", "success");
    return SCREENS.feed();
  }
  try {
    const { reflect } = await api.post("/posts", {
      text,
      provenance,
      mediaHue: hue,
      mediaDataUrl,
    });
    if (reflect)
      toast("Posted — consider taking a breath next time", "default");
    else toast("Posted", "success");
    closeOverlays();
    if (state.route.name === "feed") SCREENS.feed();
    else go("#/");
  } catch (e) {
    toast(e.message || "Could not post", "error");
  }
}

async function like(id, btn) {
  btn.classList.toggle("liked");
  const span = btn.querySelector("span");
  const cur = parseLikeCount(span.textContent);
  const liked = btn.classList.contains("liked");
  span.textContent = fmtCount(cur + (liked ? 1 : -1));
  if (state.mock) return;
  try {
    await api.post("/posts/" + id + "/like");
  } catch {
    /* rollback */ btn.classList.toggle("liked");
    span.textContent = fmtCount(cur);
  }
}
function parseLikeCount(s) {
  s = s.trim();
  if (s.endsWith("K")) return Math.round(parseFloat(s) * 1000);
  if (s.endsWith("M")) return Math.round(parseFloat(s) * 1e6);
  return parseInt(s) || 0;
}

async function forkPost(id) {
  if (state.mock) return toast("Forked — credit kept in the chain", "success");
  try {
    await api.post("/posts/" + id + "/fork", {});
    toast("Forked — credit kept in the chain", "success");
  } catch (e) {
    toast(e.message, "error");
  }
}
// Remix a video/short into a credited post (forking that actually persists).
async function forkContent(title) {
  if (state.mock) return toast("Remix saved — credit kept", "success");
  try {
    await api.post("/posts", {
      text: "Remix of: " + title,
      provenance: "remixed",
    });
    toast("Remix posted — credit kept", "success");
  } catch (e) {
    toast(e.message, "error");
  }
}
// ---- Send to contacts -------------------------------------------------------
// state._sc holds { type, id } to avoid passing complex strings through onclick attrs
async function openSendToContacts(type, id) {
  state._sc = { type, id };
  let following = [];
  try {
    ({ following } = await data.connections());
  } catch {}
  if (!following?.length)
    return toast("Follow some people first to send them content");
  openOverlay(`<div class="modal-head"><h3>${icon("send", "icon sm")} Send to contact</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    <input class="input" id="sc-search" placeholder="Search contacts…" style="margin-bottom:12px" autocomplete="off">
    <div id="sc-list" style="max-height:300px;overflow-y:auto;display:grid;gap:4px">
      ${following
        .map(
          (
            u,
          ) => `<label class="sc-row" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;cursor:pointer;border:1px solid var(--glass-border)">
        <input type="checkbox" class="sc-check" data-uid="${u.id}" style="width:18px;height:18px;accent-color:var(--accent);flex:none">
        ${avatar(u, 36)}
        <div style="min-width:0"><div class="name" style="font-size:14px">${esc(u.name)}</div><div class="handle">@${esc(u.handle)}</div></div>
      </label>`,
        )
        .join("")}
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="confirmSendToContacts()">${icon("send", "icon sm")} Send</button>`);
  // Wire live search after DOM inserts
  setTimeout(() => {
    const inp = document.getElementById("sc-search");
    if (!inp) return;
    inp.focus();
    inp.addEventListener("input", () => {
      const q = inp.value.toLowerCase();
      document.querySelectorAll(".sc-row").forEach((r) => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }, 30);
}
async function togglePostProtect(postId, isProtected) {
  try {
    await api.patch("/posts/" + postId, { forkable: isProtected }); // true = unprotect, false was protected
    toast(
      isProtected
        ? "Protection removed — others can fork"
        : "Post protected — forking disabled",
      "success",
    );
    if (state.route.name === "feed") SCREENS.feed();
    else if (state.route.name === "profile")
      SCREENS.profile(state.route.params);
  } catch (e) {
    toast(e.message || "Could not update", "error");
  }
}
async function confirmSendToContacts() {
  const { type, id } = state._sc || {};
  const checks = [...document.querySelectorAll(".sc-check:checked")];
  if (!checks.length) return toast("Select at least one contact");
  const base =
    location.origin +
    (location.pathname.endsWith("/")
      ? location.pathname.slice(0, -1)
      : location.pathname);
  const link =
    type === "video"
      ? `${base}/#/videos/${id}`
      : type === "short"
        ? `${base}/#/shorts`
        : `${base}/#/`;
  const emoji = type === "video" ? "📹" : type === "short" ? "⚡" : "📝";
  const msg = `${emoji} Shared ${type === "video" ? "a video" : type === "short" ? "a short" : "a post"}: ${link}`;
  let sent = 0;
  for (const cb of checks) {
    try {
      const { conversation } = await api.post("/conversations", {
        userId: cb.dataset.uid,
      });
      await api.post("/conversations/" + conversation.id + "/messages", {
        text: msg,
      });
      sent++;
    } catch {}
  }
  closeOverlays();
  toast(`Sent to ${sent} contact${sent !== 1 ? "s" : ""}`, "success");
}

function copyLink() {
  const url = location.href;
  if (navigator.clipboard)
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Link copied", "success"))
      .catch(() => toast("Link: " + url));
  else toast("Link: " + url);
}
function toggleSubscribe(btn) {
  const on = btn.textContent.trim() === "Subscribed";
  btn.textContent = on ? "Subscribe" : "Subscribed";
  btn.classList.toggle("btn-ghost", !on);
  btn.classList.toggle("btn-primary", on);
}
function toggleShortPlay(el) {
  const v = el.querySelector(".short-media-el");
  if (!v) return;
  if (v.paused) {
    v.muted = false;
    v.play?.().catch(() => {});
  } else {
    v.pause?.();
  }
}
async function toggleSave(btn, id, kind) {
  const on = btn.classList.toggle("liked");
  toast(on ? "Saved" : "Removed", "success");
  if (!state.mock && id) {
    try {
      await api.post("/bookmarks/" + id, { kind: kind || "post" });
    } catch {}
  }
}

async function openPost(id) {
  let post,
    comments = [];
  if (state.mock) {
    post = MOCK.feed().posts.find((p) => p.id === id) || MOCK.feed().posts[0];
  } else {
    try {
      const r = await api.get("/posts/" + id);
      post = r.post;
      comments = r.comments || [];
    } catch (e) {
      return toast(e.message, "error");
    }
  }
  const ov =
    openOverlay(`<div class="modal-head"><h3>Post</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    ${postCard(post)}
    <div class="section-label" style="margin-top:8px">Comments</div>
    <div id="comment-list">${comments.map((c) => `<div class="row" style="padding:8px 0;align-items:flex-start">${avatar(c.author, 28)}<div><span class="name" style="font-size:13.5px">${esc(c.author.name)}</span> <span class="muted">${linkify(c.text)}</span></div></div>`).join("") || '<div class="muted" style="font-size:13px">Be the first to comment.</div>'}</div>
    <div class="composer-bar" style="position:static;padding:8px 0 0"><input class="input" id="cmt-input" placeholder="Add a comment…"><button class="btn btn-primary btn-icon" onclick="submitComment('${id}')">${icon("send", "icon sm")}</button></div>`);
  ov.querySelector("#cmt-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitComment(id);
  });
}
async function submitComment(id) {
  const input = document.getElementById("cmt-input");
  const text = input.value.trim();
  if (!text) return;
  const list = document.getElementById("comment-list");
  const emptyMsg = list.querySelector(".muted");
  if (emptyMsg) emptyMsg.remove();
  list.insertAdjacentHTML(
    "beforeend",
    `<div class="row" style="padding:8px 0;align-items:flex-start">${avatar(state.me, 28)}<div><span class="name" style="font-size:13.5px">${esc(state.me.name)}</span> <span class="muted">${linkify(text)}</span></div></div>`,
  );
  input.value = "";
  const countBtn = document.querySelector(`article[data-post="${id}"] .action:nth-child(2) span`);
  if (countBtn) {
    const n = parseInt(countBtn.textContent) || 0;
    countBtn.textContent = n + 1;
  }
  if (!state.mock) {
    try {
      await api.post("/posts/" + id + "/comment", { text });
    } catch {}
  }
}

async function follow(userId, btn) {
  if (btn) {
    btn.textContent = "Requested";
    btn.disabled = true;
  }
  if (state.mock) return;
  try {
    const r = await api.post("/connections/request/" + userId, {});
    if (btn)
      btn.textContent = r.status === "accepted" ? "Following" : "Requested";
  } catch (e) {
    toast(e.message, "error");
  }
}

async function acceptRequest(requestId, btn) {
  const row = btn.closest(".notif");
  if (!state.mock) {
    try {
      await api.post("/connections/accept/" + requestId, {});
    } catch (e) {
      return toast(e.message, "error");
    }
  }
  toast("Request accepted", "success");
  if (row) row.remove();
}
async function acceptRequestByUser(_userId, btn) {
  // from notifications (no requestId handy in mock)
  if (!state.mock) {
    try {
      const c = await data.connections();
      const r = c.requests.find((x) => x.from.id === _userId);
      if (r) await api.post("/connections/accept/" + r.requestId, {});
    } catch {}
  }
  btn.closest(".notif")?.classList.remove("unread");
  btn.outerHTML = '<span class="muted" style="font-size:13px">Accepted</span>';
  toast("Request accepted", "success");
}
async function declineRequest(requestId, btn) {
  if (!state.mock) {
    try {
      await api.post("/connections/decline/" + requestId, {});
    } catch {}
  }
  btn.closest(".notif")?.remove();
  toast("Declined");
}
async function acceptInvite(inviteId, btn) {
  if (!state.mock && inviteId) {
    try {
      await api.post("/invites/" + inviteId + "/accept", {});
    } catch (e) {
      return toast(e.message || "Could not join", "error");
    }
  }
  toast("Joined the group", "success");
  btn.closest(".notif")?.classList.remove("unread");
  btn.outerHTML = '<span class="muted" style="font-size:13px">Joined</span>';
}

async function startChat(userId) {
  if (state.mock) return go("#/chat/c1");
  try {
    const { conversation } = await api.post("/conversations", { userId });
    go("#/chat/" + conversation.id);
  } catch (e) {
    toast(e.message, "error");
  }
}

// ---- Conversation view -----------------------------------------------------
async function openConversation(id) {
  state.openConvo = id;
  state._lastMsgTime = "";  // reset polling cursor
  const pane = document.getElementById("convo-pane");
  if (!pane) return;
  pane.innerHTML = `<div class="messages"><div class="skel" style="height:40px;width:60%"></div></div>`;
  let conversation, messages;
  try {
    ({ conversation, messages } = await data.messages(id));
  } catch (e) {
    pane.innerHTML = `<div class="empty">${icon("chat")}<div>Could not open this chat</div></div>`;
    return;
  }
  state._convoMembers = conversation.members || [];
  state._lastMsgTime = messages.length ? messages[messages.length - 1].createdAt : "";
  try {
    await api.post("/conversations/" + id + "/read");
  } catch {}
  const headUser = {
    name: conversation.title || "Conversation",
    avatarRef: conversation.avatarRef || { kind: "gradient", hue: 210 },
  };
  pane.innerHTML = `
    <header class="convo-header glass-strong">
      <button class="btn-icon" onclick="go('#/chat')" aria-label="Back">${icon("back")}</button>
      ${avatarWrap(headUser, 40, !!conversation.online)}
      <div style="min-width:0"><div class="name">${esc(headUser.name)}</div><div class="handle" id="presence-line">${esc(conversation.presence || (conversation.online ? "online" : "offline"))}</div></div>
      <div class="spacer" style="flex:1"></div>
    </header>
    <div class="messages" id="messages">${messages.map((m) => bubble(m)).join("") || `<div class="empty">${icon("chat")}<div>Say hello</div></div>`}</div>
    <div class="typing" id="typing"></div>
    <div class="composer-bar glass-strong">
      <input class="input" id="msg-input" placeholder="Type a message…" autocomplete="off">
      <button class="btn-icon" onclick="openSchedule()" title="Schedule for later">${icon("clock", "icon sm")}</button>
      <button class="btn btn-primary btn-icon" onclick="sendMessage()" aria-label="Send">${icon("send", "icon sm")}</button>
    </div>`;
  const input = pane.querySelector("#msg-input");
  scrollMessages();
  if (!isTouch()) input.focus();
  let typingTimer;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
      return;
    }
  });
  wireMessageGestures(pane.querySelector("#messages"));
}
const isTouch = () => matchMedia("(hover: none)").matches;

function bubble(m) {
  const out = m.senderId === state.me?.id;
  const tick = out
    ? m.status === "read"
      ? `<span class="tick read">${icon("checkCheck", "tick read")}</span>`
      : m.status === "delivered"
        ? icon("checkCheck", "tick")
        : icon("check", "tick")
    : "";
  const edited = m.edited ? '<span class="edited">edited · </span>' : "";
  const menu = out
    ? `<button class="msg-menu-btn" onclick="openMsgMenu(event,'${m.id}')" aria-label="Message options">${icon("more", "icon sm")}</button>`
    : "";
  return `<div class="msg-line ${out ? "out" : "in"}" data-id="${m.id}" data-out="${out}">
    ${menu}
    <div class="bubble ${out ? "out" : "in"}"><span class="btext">${linkify(m.text)}</span><div class="ts">${edited}${fmtTime(m.createdAt)} ${tick}</div></div>
  </div>`;
}
function scrollMessages() {
  const m = document.getElementById("messages");
  if (m) m.scrollTop = m.scrollHeight;
}

// Long-press (mobile) opens the message menu for your own messages.
function wireMessageGestures(box) {
  if (!box) return;
  let t;
  box.addEventListener(
    "touchstart",
    (e) => {
      const line = e.target.closest('.msg-line[data-out="true"]');
      if (!line) return;
      t = setTimeout(() => {
        navigator.vibrate?.(15);
        openMsgMenu(
          {
            currentTarget: line.querySelector(".bubble"),
            clientX: 0,
            clientY: 0,
            preventDefault() {},
          },
          line.dataset.id,
          line,
        );
      }, 480);
    },
    { passive: true },
  );
  const cancel = () => clearTimeout(t);
  box.addEventListener("touchend", cancel);
  box.addEventListener("touchmove", cancel);
  box.addEventListener("touchcancel", cancel);
}

function openMsgMenu(e, mid, lineEl) {
  e.preventDefault?.();
  closeMsgMenu();
  const line = lineEl || document.querySelector(`.msg-line[data-id="${mid}"]`);
  if (!line) return;
  const pop = document.createElement("div");
  pop.className = "msg-pop glass-strong";
  pop.id = "msg-pop";
  pop.innerHTML = `
    <button onclick="editMessage('${mid}')">${icon("edit", "icon sm")} Edit</button>
    <button onclick="copyMessage('${mid}')">${icon("copy", "icon sm")} Copy</button>
    <button class="danger" onclick="deleteMessage('${mid}')">${icon("trash", "icon sm")} Delete</button>`;
  line.appendChild(pop);
  // position above the bubble, aligned to its side
  pop.style.bottom = "100%";
  pop.style[line.dataset.out === "true" ? "right" : "left"] = "0";
  setTimeout(
    () => document.addEventListener("click", closeMsgMenu, { once: true }),
    0,
  );
}
function closeMsgMenu() {
  document.getElementById("msg-pop")?.remove();
}

function copyMessage(mid) {
  const t =
    document.querySelector(`.msg-line[data-id="${mid}"] .btext`)?.textContent ||
    "";
  if (navigator.clipboard)
    navigator.clipboard.writeText(t).then(() => toast("Copied", "success"));
  closeMsgMenu();
}
function editMessage(mid) {
  closeMsgMenu();
  const cur =
    document.querySelector(`.msg-line[data-id="${mid}"] .btext`)?.textContent ||
    "";
  const ov =
    openOverlay(`<div class="modal-head"><h3>Edit message</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    <textarea class="input" id="edit-text" rows="3">${esc(cur)}</textarea>
    <button class="btn btn-primary" style="margin-top:12px;width:100%" onclick="saveEdit('${mid}')">Save</button>`);
  const ta = ov.querySelector("#edit-text");
  ta.focus();
  ta.setSelectionRange(cur.length, cur.length);
}
async function saveEdit(mid) {
  const text = document.getElementById("edit-text").value.trim();
  if (!text) return toast("Message can’t be empty");
  try {
    await api.patch("/conversations/" + state.openConvo + "/messages/" + mid, {
      text,
    });
    applyMessageEdit(mid, text);
    closeOverlays();
  } catch (e) {
    toast(e.message || "Could not edit", "error");
  }
}
function applyMessageEdit(mid, text) {
  const line = document.querySelector(`.msg-line[data-id="${mid}"]`);
  if (!line) return;
  const bt = line.querySelector(".btext");
  if (bt) bt.innerHTML = linkify(text);
  const ts = line.querySelector(".ts");
  if (ts && !ts.querySelector(".edited"))
    ts.insertAdjacentHTML(
      "afterbegin",
      '<span class="edited">edited · </span>',
    );
}
function deleteMessage(mid) {
  // Replace the popup with an inline confirm so there's no native dialog.
  const pop = document.getElementById("msg-pop");
  if (!pop) return;
  pop.innerHTML = `<div style="padding:4px 2px"><div style="font-size:13px;font-weight:600;margin-bottom:10px">Delete this message?</div>
    <div class="row" style="gap:8px">
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="closeMsgMenu()">Cancel</button>
      <button class="btn btn-primary btn-sm" style="flex:1;background:var(--danger);box-shadow:none" onclick="confirmDeleteMessage('${mid}')">Delete</button>
    </div></div>`;
}
async function confirmDeleteMessage(mid) {
  closeMsgMenu();
  try {
    await api.post(
      "/conversations/" + state.openConvo + "/messages/" + mid + "/delete",
      {},
    );
    document.querySelector(`.msg-line[data-id="${mid}"]`)?.remove();
  } catch (e) {
    toast(e.message || "Could not delete", "error");
  }
}

async function sendMessage() {
  const input = document.getElementById("msg-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const id = state.openConvo;
  input.value = "";
  const box = document.getElementById("messages");
  const empty = box && box.querySelector(".empty");
  if (empty) empty.remove();

  // Optimistic render
  const optimistic = {
    id: "tmp" + Date.now(),
    senderId: state.me.id,
    text,
    status: "sent",
    createdAt: new Date().toISOString(),
  };
  if (box) {
    box.insertAdjacentHTML("beforeend", bubble(optimistic));
    scrollMessages();
  }
  if (state.mock) return;
  try {
    const r = await api.post("/conversations/" + id + "/messages", { text });
    // Replace optimistic bubble with real one
    const el = box && box.querySelector(`[data-id="${optimistic.id}"]`);
    if (el) el.setAttribute("data-id", r.message.id);
    // Update last poll time so we don't re-poll this message
    state._lastMsgTime = r.message.createdAt;
    updateChatListItem(id, text, r.message.createdAt);
  } catch (e) {
    toast(e.message || "Could not send", "error");
  }
}

function openSchedule() {
  openOverlay(`<div class="modal-head"><h3>Schedule message</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    <p class="muted" style="font-size:13px">Pick a time — the message sends itself later (signature feature).</p>
    <input class="input" type="datetime-local" id="sched-time" style="margin:12px 0">
    <input class="input" id="sched-text" placeholder="Message…" style="margin-bottom:12px">
    <button class="btn btn-primary" onclick="scheduleSend()">${icon("clock", "icon sm")} Schedule</button>`);
}
async function scheduleSend() {
  const when = document.getElementById("sched-time").value;
  const text = document.getElementById("sched-text").value.trim();
  if (!when || !text) return toast("Pick a time and write a message");
  if (!state.mock) {
    try {
      await api.post("/conversations/" + state.openConvo + "/messages", {
        text,
        sendAt: new Date(when).toISOString(),
      });
    } catch {}
  }
  closeOverlays();
  toast("Message scheduled", "success");
}

async function openNewChat() {
  const c = await data.connections();
  const people = [...(c.following || []), ...(c.suggested || [])];
  openOverlay(`<div class="modal-head"><h3>New chat</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    ${people.map((u) => `<div class="chat-item" onclick="closeOverlays();startChat('${u.id}')">${avatar(u, 40)}<div class="meta"><div class="name">${esc(u.name)}</div><div class="handle">@${esc(u.handle)}</div></div></div>`).join("")}`);
}

// ---- Feed control (Open Algorithm) ----------------------------------------
function openFeedControl() {
  const p = state.feedPrefs;
  const slider = (
    k,
    label,
    left,
    right,
  ) => `<div class="slider-row"><label><span>${label}</span></label>
    <input type="range" min="0" max="1" step="0.05" value="${p[k]}" data-k="${k}" oninput="this.closest('.panel').dataset.dirty=1">
    <div class="ends"><span>${left}</span><span>${right}</span></div></div>`;
  const ov = openOverlay(
    `<div class="modal-head"><h3>Tune your feed</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    <p class="muted" style="font-size:13px">The Open Algorithm answers to you. Slide to reshape what you see.</p>
    ${slider("recency", "Freshness", "Evergreen", "Fresh")}
    ${slider("popularity", "Popularity", "Niche", "Viral")}
    ${slider("following", "Source", "Discovery", "People I follow")}
    ${slider("depth", "Depth", "Likes", "Saves & forks")}
    <div class="slider-row"><label><span>Authenticity filter</span></label>
      <div class="seg" id="prov-filter"><button data-v="all" class="${p.provenance === "all" ? "active" : ""}">All</button><button data-v="real" class="${p.provenance === "real" ? "active" : ""}">Real</button><button data-v="ai" class="${p.provenance === "ai" ? "active" : ""}">AI</button><button data-v="remixed" class="${p.provenance === "remixed" ? "active" : ""}">Remixed</button></div></div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="applyFeedPrefs(this)">Apply</button>`,
    "panel",
  );
  segWire("prov-filter");
  ov.querySelector("#prov-filter").dataset.value = p.provenance;
}
async function applyFeedPrefs(btn) {
  const panel = btn.closest(".panel");
  panel
    .querySelectorAll("input[type=range]")
    .forEach((r) => (state.feedPrefs[r.dataset.k] = parseFloat(r.value)));
  state.feedPrefs.provenance =
    document.getElementById("prov-filter").dataset.value || "all";
  if (!state.mock) {
    try {
      await api.put("/feed/prefs", state.feedPrefs);
    } catch {}
  }
  closeOverlays();
  toast("Feed updated", "success");
  SCREENS.feed();
}

// ---- Compose modal ---------------------------------------------------------
function openComposer() {
  const ov =
    openOverlay(`<div class="modal-head"><h3>Create</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    <div class="tabs" id="create-tabs"><button class="active" data-t="post">Post</button><button data-t="video">Video</button><button data-t="short">Short</button></div>
    <div id="create-body">${composePostBody()}</div>`);
  const tabs = ov.querySelector("#create-tabs");
  tabs.querySelectorAll("button").forEach(
    (b) =>
      (b.onclick = () => {
        tabs
          .querySelectorAll("button")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        document.getElementById("create-body").innerHTML =
          b.dataset.t === "post"
            ? composePostBody()
            : b.dataset.t === "video"
              ? composeVideoBody()
              : composeShortBody();
        if (b.dataset.t === "post") segWire("compose-prov");
      }),
  );
  segWire("compose-prov");
}
function composePostBody() {
  state.modalImage = null;
  return `<textarea class="input" id="compose-text" rows="4" placeholder="Share something real…" oninput="autoGrow(this)"></textarea>
    <div id="compose-preview"></div>
    <div class="composer-tools"><div class="seg" id="compose-prov"><button class="active" data-v="real">Real</button><button data-v="ai">AI</button><button data-v="remixed">Remixed</button></div>
    <button class="btn btn-ghost btn-sm" onclick="pickImage('modal')">${icon("image", "icon sm")} Photo</button>
    <button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="composeSubmitPost()">${icon("send", "icon sm")} Post</button></div>`;
}
function composeVideoBody() {
  state.videoUpload = null;
  return `<button class="card glass" id="vid-drop" style="width:100%;text-align:center;padding:24px;margin-bottom:12px;display:block" onclick="pickVideo('video')">${icon("video", "icon lg")}<div style="font-weight:600;margin-top:8px">Choose a video file</div><div class="muted" style="font-size:12px">MP4, WebM or MOV</div></button>
    <div id="vid-preview"></div>
    <input class="input" id="vid-title" placeholder="Title" style="margin-bottom:8px"><textarea class="input" id="vid-desc" rows="2" placeholder="Description"></textarea>
    <div class="section-label" style="margin-top:8px">Thumbnail</div>
    <div class="row" style="margin-bottom:12px;gap:10px" id="vid-thumb-row">
      <div id="vid-thumb-preview" style="width:80px;height:50px;border-radius:8px;${gradFor({ hue: 220 })};display:flex;align-items:center;justify-content:center;flex:none">${icon("image", "icon sm")}</div>
      <div style="flex:1"><div class="muted" style="font-size:12px">Auto-captured from video, or upload your own.</div>
        <button class="btn btn-ghost btn-sm" onclick="changeThumb('video')" style="margin-top:4px">${icon("image", "icon sm")} Upload thumbnail</button></div>
    </div>
    <button class="btn btn-primary" id="vid-publish" style="margin-top:8px;width:100%" onclick="composeSubmitVideo()">${icon("plus", "icon sm")} Publish video</button>`;
}
function composeShortBody() {
  state.shortUpload = null;
  return `<button class="card glass" id="short-drop" style="width:100%;text-align:center;padding:24px;margin-bottom:12px;display:block" onclick="pickVideo('short')">${icon("shorts", "icon lg")}<div style="font-weight:600;margin-top:8px">Choose a vertical video</div><div class="muted" style="font-size:12px">Best in 9:16</div></button>
    <div id="short-preview"></div>
    <input class="input" id="short-caption" placeholder="Title">
    <div class="section-label" style="margin-top:8px">Thumbnail</div>
    <div class="row" style="margin-bottom:12px;gap:10px" id="short-thumb-row">
      <div id="short-thumb-preview" style="width:80px;height:50px;border-radius:8px;${gradFor({ hue: 200 })};display:flex;align-items:center;justify-content:center;flex:none">${icon("image", "icon sm")}</div>
      <div style="flex:1"><div class="muted" style="font-size:12px">Auto-captured from video, or upload your own.</div>
        <button class="btn btn-ghost btn-sm" onclick="changeThumb('short')" style="margin-top:4px">${icon("image", "icon sm")} Upload thumbnail</button></div>
    </div>
    <button class="btn btn-primary" id="short-publish" style="margin-top:8px;width:100%" onclick="composeSubmitShort()">${icon("plus", "icon sm")} Publish short</button>`;
}

// Pick a video file, build an object-URL preview, and capture a poster frame + duration.
function pickVideo(target) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "video/*";
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = url;
    const finish = (thumb, duration) => {
      state[target + "Upload"] = {
        file,
        url,
        duration: duration || 0,
        thumb: thumb || "",
      };
      renderUploadPreview(target);
    };
    v.onloadedmetadata = () => {
      const d = v.duration || 0;
      const tryTimes = [d * 0.25, d * 0.5, d * 0.1, 1];
      let idx = 0;
      const tryNext = () => {
        if (idx >= tryTimes.length) { finish("", d); return; }
        try { v.currentTime = Math.min(tryTimes[idx++], d || 0); } catch { tryNext(); }
      };
      v.onseeked = () => {
        let thumb = "";
        try {
          const w = 360, scale = w / (v.videoWidth || w);
          const cv = document.createElement("canvas");
          cv.width = w;
          cv.height = Math.round((v.videoHeight || w) * scale);
          const ctx = cv.getContext("2d");
          ctx.drawImage(v, 0, 0, cv.width, cv.height);
          const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
          let brightness = 0;
          for (let i = 0; i < px.length; i += 16) brightness += px[i] + px[i + 1] + px[i + 2];
          brightness /= (px.length / 16 * 3);
          if (brightness < 15 && idx < tryTimes.length) { tryNext(); return; }
          thumb = cv.toDataURL("image/jpeg", 0.72);
        } catch {}
        finish(thumb, v.duration);
      };
      tryNext();
    };
    v.onerror = () => finish("", 0);
  };
  inp.click();
}
function renderUploadPreview(target) {
  const up = state[target + "Upload"];
  const box = document.getElementById(target + "-preview");
  if (!box || !up) return;
  const vertical = target === "short";
  const thumb = up.thumb
    ? `<img src="${up.thumb}" style="width:72px;height:44px;object-fit:cover;border-radius:8px;flex:none">`
    : `<div style="width:72px;height:44px;border-radius:8px;flex:none;${gradFor({ hue: 220 })}"></div>`;
  box.innerHTML = `<div class="media" style="margin:0 0 10px;position:relative;${vertical ? "aspect-ratio:9/16;max-height:300px;margin-inline:auto;width:auto;" : ""}">
    <video src="${up.url}" style="width:100%;height:100%;object-fit:cover;border-radius:12px" muted controls playsinline></video>
    <button class="btn-icon glass" style="position:absolute;top:8px;right:8px" onclick="clearUpload('${target}')">${icon("x", "icon sm")}</button></div>
    <div class="muted" style="font-size:12px;margin-bottom:10px">${esc(up.file.name)} · ${fmtDuration(up.duration)}</div>`;
  // Update the standalone thumbnail preview in the compose form
  const thumbPrev = document.getElementById(target + "-thumb-preview");
  if (thumbPrev && up.thumb) {
    thumbPrev.innerHTML = `<img src="${up.thumb}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" alt="">`;
  }
}
// Replace the auto thumbnail with a chosen image.
function changeThumb(target) {
  const up = state[target + "Upload"];
  if (!up) return toast("Pick a video first, then upload a thumbnail");
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.style.cssText = "position:fixed;left:-9999px";
  document.body.appendChild(inp);
  inp.onchange = () => {
    const file = inp.files[0];
    document.body.removeChild(inp);
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = 480, s = w / img.width;
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const dataUrl = cv.toDataURL("image/jpeg", 0.8);
        if (state[target + "Upload"]) state[target + "Upload"].thumb = dataUrl;
        const thumbPrev = document.getElementById(target + "-thumb-preview");
        if (thumbPrev) thumbPrev.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px" alt="">`;
        renderUploadPreview(target);
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  };
  inp.click();
}
function clearUpload(target) {
  const up = state[target + "Upload"];
  if (up?.url) URL.revokeObjectURL(up.url);
  state[target + "Upload"] = null;
  const box = document.getElementById(target + "-preview");
  if (box) box.innerHTML = "";
}
async function composeSubmitPost() {
  const text = document.getElementById("compose-text").value.trim();
  if (!text && !state.modalImage)
    return toast("Write something or add a photo");
  const provenance =
    document.getElementById("compose-prov").dataset.value || "real";
  await createPost(text, provenance, null, state.modalImage);
}
async function composeSubmitVideo() {
  const title = document.getElementById("vid-title").value.trim();
  if (!title) return toast("Give your video a title");
  const up = state.videoUpload;
  if (!up) return toast("Choose a video file");
  const btn = document.getElementById("vid-publish");
  btn.disabled = true;
  btn.textContent = "Uploading…";
  try {
    const m = await uploadFile(up.file);
    await api.post("/videos", {
      title,
      description: document.getElementById("vid-desc").value,
      provenance: "real",
      mediaUrl: m.url,
      thumbnailDataUrl: up.thumb,
      durationS: up.duration,
    });
    clearUpload("video");
    closeOverlays();
    toast("Video published", "success");
    SCREENS.videos();
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = `${icon("plus", "icon sm")} Publish video`;
    toast(e.message, "error");
  }
}
async function composeSubmitShort() {
  const up = state.shortUpload;
  if (!up) return toast("Choose a vertical video");
  const caption = document.getElementById("short-caption").value.trim();
  const btn = document.getElementById("short-publish");
  btn.disabled = true;
  btn.textContent = "Uploading…";
  try {
    const m = await uploadFile(up.file);
    await api.post("/shorts", {
      caption,
      provenance: "real",
      mediaUrl: m.url,
      thumbnailDataUrl: up.thumb,
      durationS: up.duration,
    });
    clearUpload("short");
    closeOverlays();
    toast("Short published", "success");
    go("#/shorts");
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = `${icon("plus", "icon sm")} Publish short`;
    toast(e.message, "error");
  }
}

// ---- Explore search --------------------------------------------------------
async function runSearch(q) {
  const box = document.getElementById("explore-results");
  if (!box) return;
  const r = await data.explore(q, "all");
  if (!q) {
    box.innerHTML = `<div class="section-label">Trending</div><div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:24px">${(r.trending || []).map((t) => `<a class="badge" href="#/explore?q=${t.tag}">#${esc(t.tag)}</a>`).join("")}</div>
      <div class="section-label">People</div>${(r.users || [])
        .slice(0, 5)
        .map((u) => userRow(u))
        .join("")}
      <div class="section-label" style="margin-top:24px">Videos</div><div class="video-grid">${(r.videos || []).slice(0, 4).map(videoCard).join("")}</div>`;
    return;
  }
  const total =
    (r.users?.length || 0) +
    (r.posts?.length || 0) +
    (r.videos?.length || 0) +
    (r.shorts?.length || 0);
  if (!total) {
    box.innerHTML = emptyState("No results for “" + esc(q) + "”", "search");
    return;
  }
  box.innerHTML = `${r.users?.length ? `<div class="section-label">People</div>${r.users.map((u) => userRow(u)).join("")}` : ""}
    ${r.posts?.length ? `<div class="section-label" style="margin-top:24px">Posts</div>${r.posts.map(postCard).join("")}` : ""}
    ${r.videos?.length ? `<div class="section-label" style="margin-top:24px">Videos</div><div class="video-grid">${r.videos.map(videoCard).join("")}</div>` : ""}`;
}

// ---- Misc actions ----------------------------------------------------------
function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}
function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem("os_theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  SCREENS.settings();
}
function toggleSetting(key) {
  if (key === "os_notif") {
    const isOn = localStorage.getItem(key) !== "off";
    localStorage.setItem(key, isOn ? "off" : "on");
  } else if (key === "os_private") {
    const newVal = !state.me?.isPrivate;
    if (state.me) state.me = { ...state.me, isPrivate: newVal };
    api
      .patch("/users/me", { isPrivate: newVal })
      .then((r) => {
        state.me = { ...state.me, isPrivate: r.user.isPrivate };
      })
      .catch(() => {});
  }
  SCREENS.settings();
}
function openEditProfile() {
  delete state._epAvatar;
  delete state._epBanner;
  const ov =
    openOverlay(`<div class="modal-head"><h3>Edit profile</h3><button class="btn-icon" onclick="closeOverlays()">${icon("x")}</button></div>
    <div class="section-label">Profile picture (logo)</div>
    <div class="row" style="margin-bottom:14px;gap:14px">
      <div id="ep-avatar-preview" style="width:72px;height:72px;border-radius:50%;overflow:hidden;flex:none">${avatar(state.me, 72)}</div>
      <button class="btn btn-ghost btn-sm" onclick="pickEpAvatar()">${icon("image", "icon sm")} Change photo</button>
    </div>
    <div class="section-label">Channel banner</div>
    <div id="ep-banner-preview" style="height:90px;border-radius:10px;overflow:hidden;margin-bottom:8px">${gradientMedia(state.me?.bannerRef, (state.me?.avatarRef?.hue || 240) + 40)}</div>
    <button class="btn btn-ghost btn-sm" onclick="pickEpBanner()" style="margin-bottom:16px">${icon("image", "icon sm")} Change banner</button>
    <label class="muted" style="font-size:12px">Display name</label>
    <input class="input" id="ep-name" value="${esc(state.me?.name || "")}" style="margin:4px 0 12px">
    <label class="muted" style="font-size:12px">Bio</label>
    <textarea class="input" id="ep-bio" rows="3" style="margin:4px 0 16px" placeholder="Tell people about you">${esc(state.me?.bio || "")}</textarea>
    <button class="btn btn-primary" style="width:100%" onclick="saveProfile()">Save changes</button>`);
  ov.querySelector("#ep-name").focus();
}
function pickEpAvatar() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      state._epAvatar = r.result;
      const prev = document.getElementById("ep-avatar-preview");
      if (prev)
        prev.innerHTML = `<img src="${r.result}" style="width:100%;height:100%;object-fit:cover" alt="">`;
    };
    r.readAsDataURL(file);
  };
  inp.click();
}
function pickEpBanner() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      state._epBanner = r.result;
      const prev = document.getElementById("ep-banner-preview");
      if (prev)
        prev.innerHTML = `<img src="${r.result}" style="width:100%;height:100%;object-fit:cover" alt="">`;
    };
    r.readAsDataURL(file);
  };
  inp.click();
}
async function saveProfile() {
  const name = document.getElementById("ep-name").value.trim();
  const bio = document.getElementById("ep-bio").value.trim();
  const body = { name, bio };
  if (state._epAvatar) body.avatarDataUrl = state._epAvatar;
  if (state._epBanner) body.bannerDataUrl = state._epBanner;
  try {
    const r = await api.patch("/users/me", body);
    state.me = {
      ...state.me,
      name: r.user.name,
      bio: r.user.bio,
      avatarRef: r.user.avatarRef,
      bannerRef: r.user.bannerRef,
    };
    delete state._epAvatar;
    delete state._epBanner;
    closeOverlays();
    toast("Profile updated", "success");
    SCREENS.settings();
  } catch (e) {
    toast(e.message, "error");
  }
}
async function deleteAccount() {
  if (!confirm("Delete your account and all your data? This cannot be undone."))
    return;
  try {
    await api.post("/users/me/delete", {});
  } catch {}
  logout();
}
async function exportData() {
  if (state.mock) return toast("Export ready (offline preview)", "success");
  try {
    const d = await api.get("/users/me/export");
    const blob = new Blob([JSON.stringify(d, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "open-store-export.json";
    a.click();
    toast("Your data exported", "success");
  } catch (e) {
    toast(e.message, "error");
  }
}
function logout() {
  localStorage.removeItem("os_token");
  state.token = null;
  state.me = null;
  location.hash = "#/";
  location.reload();
}

// ---- Admin helpers ----------------------------------------------------------
function adminUserRows(users) {
  if (!users.length) return emptyState("No users found", "user");
  return users
    .map(
      (u) => `<div class="card glass" style="margin-bottom:8px">
    <div class="row">${avatar(u, 40)}<div style="flex:1;min-width:0">
      <div class="name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.name)} ${verifiedMark(u.verified)} ${roleChip(u.role)}</div>
      <div class="handle">@${esc(u.handle)}</div>
    </div>
    <div class="row" style="gap:6px;flex-wrap:wrap">
      ${
        u.role !== "owner"
          ? `<select class="btn btn-ghost btn-sm" onchange="adminSetRole('${u.id}',this.value)" style="padding:0 8px">
        <option${u.role === "regular" ? " selected" : ""}>regular</option>
        <option${u.role === "special" ? " selected" : ""}>special</option>
        <option${u.role === "admin" ? " selected" : ""}>admin</option>
      </select>`
          : `<span class="badge" style="color:var(--warn)">Owner</span>`
      }
      <button class="btn btn-ghost btn-sm" onclick="adminToggleVerify('${u.id}',${u.verified})">${u.verified ? "Unverify" : "Verify"}</button>
      ${u.role !== "owner" ? `<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="adminBan('${u.id}','${esc(u.handle)}')">Ban</button>` : ""}
    </div></div>
  </div>`,
    )
    .join("");
}
async function adminSearchUsers(q) {
  try {
    const r = await api.get("/admin/users?q=" + encodeURIComponent(q));
    const el = document.getElementById("admin-user-list");
    if (el) el.innerHTML = adminUserRows(r.users || []);
  } catch {}
}
async function adminSetRole(id, role) {
  try {
    await api.post("/admin/users/" + id + "/role", { role });
    toast("Role updated to " + role, "success");
  } catch (e) {
    toast(e.message, "error");
  }
}
async function adminToggleVerify(id, currently) {
  try {
    await api.post("/admin/users/" + id + "/verify", { verified: !currently });
    toast(currently ? "Unverified" : "Verified ✓", "success");
    SCREENS.admin();
  } catch (e) {
    toast(e.message, "error");
  }
}
async function adminBan(id, handle) {
  if (!confirm(`Ban @${handle}? They will not be able to log in.`)) return;
  try {
    await api.post("/admin/users/" + id + "/ban", {});
    toast("@" + handle + " banned", "success");
    SCREENS.admin();
  } catch (e) {
    toast(e.message, "error");
  }
}

// ---- Profile tab switching (delegated) -------------------------------------
document.addEventListener("click", (e) => {
  const tab = e.target.closest("#profile-tabs button");
  if (!tab) return;
  document
    .querySelectorAll("#profile-tabs button")
    .forEach((b) => b.classList.remove("active"));
  tab.classList.add("active");
  const data = window.__profile || {};
  const which = tab.dataset.tab;
  const content = document.getElementById("profile-content");
  if (which === "posts")
    content.innerHTML = data.posts?.length
      ? data.posts.map(postCard).join("")
      : emptyState("No posts yet", "home");
  else if (which === "videos")
    content.innerHTML = data.videos?.length
      ? `<div class="video-grid">${data.videos.map(videoCard).join("")}</div>`
      : emptyState("No videos yet", "video");
  else if (which === "shorts")
    content.innerHTML = data.shorts?.length
      ? `<div class="content-grid">${data.shorts.map((s) => `<a class="grid-tile" href="#/shorts">${gradientMedia(s.thumbnailRef, 200)}</a>`).join("")}</div>`
      : emptyState("No shorts yet", "shorts");
  else if (which === "saved") {
    content.innerHTML = skeletonList(2);
    api
      .get("/bookmarks")
      .then((r) => {
        const html =
          [
            r.videos?.length
              ? `<div class="section-label">Videos</div><div class="video-grid">${r.videos.map(videoCard).join("")}</div>`
              : "",
            r.posts?.length
              ? `<div class="section-label" style="margin-top:8px">Posts</div>${r.posts.map(postCard).join("")}`
              : "",
          ].join("") ||
          emptyState(
            "Nothing saved yet — tap the bookmark on any post or video",
            "bookmark",
          );
        content.innerHTML = html;
      })
      .catch(() => {
        content.innerHTML = emptyState("Could not load", "x");
      });
  } else SCREENS.profile({ handle: state.route.params.handle });
});

// ===========================================================================
// Real-time helpers (polling replaces WebSocket)
// ===========================================================================
function clearTyping() {
  const el = document.getElementById("typing");
  if (el) el.innerHTML = "";
}

function updateChatListItem(convoId, text, createdAt, incrementUnread) {
  const item = document.querySelector(`.chat-item[onclick*="${convoId}"]`);
  if (!item) return;
  const lastEl = item.querySelector(".last");
  if (lastEl) lastEl.textContent = text || "No messages yet";
  const timeEl = item.querySelector(".time");
  if (timeEl && createdAt) timeEl.textContent = timeAgo(createdAt);
  if (incrementUnread) {
    let pill = item.querySelector(".unread-pill");
    if (pill) {
      pill.textContent = parseInt(pill.textContent || "0") + 1;
    } else {
      const meta = item.querySelector(".meta .row:last-child");
      if (meta) meta.insertAdjacentHTML("beforeend", `<span class="unread-pill">1</span>`);
    }
  }
  // Move this item to the top of the chat list
  const list = item.parentElement;
  if (list && list.firstChild !== item) {
    list.insertBefore(item, list.firstChild);
  }
}

function refreshBadges() {
  document
    .querySelectorAll(
      '.sidebar a[href="#/notifications"] .nav-badge, .rail a[href="#/notifications"] .nav-badge',
    )
    .forEach((b) => b.remove());
  // Update chat badge
  document
    .querySelectorAll('.sidebar a[href="#/chat"] .nav-badge, .rail a[href="#/chat"] .nav-badge')
    .forEach((b) => b.remove());
  if (state.unread.chat > 0) {
    document.querySelectorAll('.sidebar a[href="#/chat"], .rail a[href="#/chat"]').forEach((a) => {
      a.insertAdjacentHTML("beforeend", `<span class="nav-badge">${state.unread.chat}</span>`);
    });
  }
}

// ===========================================================================
// Boot
// ===========================================================================
async function render() {
  state.route = parseRoute();
  if (state.route.name !== "chat") {
    document.body.classList.remove("in-convo");
    state.openConvo = null;
  }
  closeMsgMenu();
  const screen = SCREENS[state.route.name] || SCREENS.feed;
  try {
    await screen(state.route.params);
  } catch (e) {
    console.error(e);
    if (e.status === 401) logout();
    else renderShell(emptyState("Something went wrong", "x"), "Open Store");
  }
}

window.addEventListener("hashchange", () => {
  if (state.me) render();
});

// ---- Auth screen (real signup / login) ------------------------------------
function renderAuth(mode = "login") {
  const isLogin = mode === "login";
  root.innerHTML = `<div class="auth-stage">
    <div class="auth-card glass-strong">
      <div class="brand" style="justify-content:center;gap:10px;font-size:22px;font-weight:700;margin-bottom:4px"><span class="brand-mark" style="width:38px;height:38px;border-radius:11px">${icon("globe")}</span> Open Store</div>
      <p class="muted" style="text-align:center;margin:0 0 20px;font-size:14px">See into it, trust it, own it.</p>
      <div class="tabs" style="justify-content:center">
        <button class="${isLogin ? "active" : ""}" onclick="renderAuth('login')">Sign in</button>
        <button class="${!isLogin ? "active" : ""}" onclick="renderAuth('signup')">Create account</button>
      </div>
      <form id="auth-form" onsubmit="return false" style="display:grid;gap:12px;margin-top:8px">
        ${isLogin ? "" : `<input class="input" id="au-name" placeholder="Display name" autocomplete="name">`}
        <input class="input" id="au-handle" placeholder="Handle (e.g. alex)" autocomplete="username">
        <input class="input" id="au-pass" type="password" placeholder="Password" autocomplete="${isLogin ? "current-password" : "new-password"}">
        <button class="btn btn-primary" style="height:46px" onclick="submitAuth('${mode}')">${isLogin ? "Sign in" : "Create account"}</button>
        <div id="auth-error" class="muted" style="color:var(--danger);font-size:13px;text-align:center;min-height:16px"></div>
      </form>
      <p class="muted" style="text-align:center;font-size:12px;margin-top:8px">${isLogin ? "New here? Create an account — the first account owns this instance." : "Your account and content are stored locally and persist across restarts."}</p>
    </div>
  </div>`;
  const form = document.getElementById("auth-form");
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAuth(mode);
    }
  });
  document.getElementById(isLogin ? "au-handle" : "au-name").focus();
}
async function submitAuth(mode) {
  const handle = document.getElementById("au-handle").value.trim();
  const pass = document.getElementById("au-pass").value;
  const errEl = document.getElementById("auth-error");
  if (!handle || !pass) {
    errEl.textContent = "Enter a handle and password.";
    return;
  }
  try {
    if (mode === "login") await login(handle, pass);
    else
      await signup(
        handle,
        document.getElementById("au-name").value.trim() || handle,
        pass,
      );
    await startApp();
  } catch (e) {
    errEl.textContent = e.message || "Something went wrong.";
  }
}

function renderOffline() {
  root.innerHTML = `<div class="auth-stage"><div class="auth-card glass-strong" style="text-align:center">
    ${icon("globe", "icon lg")}<h3 style="margin:12px 0 6px">Server not running</h3>
    <p class="muted" style="font-size:14px">Start the backend, then reload:</p>
    <pre style="background:var(--glass);padding:12px;border-radius:10px;text-align:left;font-size:13px;overflow:auto">cd "open store/server"\nnpm run dev</pre>
    <button class="btn btn-primary" style="margin-top:8px" onclick="location.reload()">Reload</button>
  </div></div>`;
}

async function startApp() {
  try {
    const n = await data.notifications();
    state.unread.notif = n.unread || 0;
  } catch {}
  try {
    const c = await data.conversations();
    state.unread.chat = (c.conversations || []).reduce(
      (a, x) => a + (x.unread || 0),
      0,
    );
  } catch {}
  startPolling();
  render();
}

(async function init() {
  const status = await boot();
  if (status === "auth") return renderAuth("signup");
  if (status === "offline") return renderOffline();
  await startApp();
})();
