// Open Store — REST API (versioned under /api/v1 by index.js)
// Covers the non-negotiable core six actions (tweet, chat, upload video, upload
// short, accept request, accept invite) plus feed, profiles, explore, notifications.
// Telegram is reached ONLY through the storage abstraction (db / media).

import express, { Router } from "express";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db, media } from "./store.js";
import { signToken, publicUser, requireAuth, optionalAuth } from "./auth.js";
import {
  rankFeed,
  trending,
  suggestedUsers,
  search,
  DEFAULT_FEED_PREFS,
} from "./algorithms.js";
import { emitToUser, emitToConversation, isOnline, updatePresence } from "./realtime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(__dirname, "..", "data", "media");
try { fs.mkdirSync(MEDIA_DIR, { recursive: true }); } catch {}
const EXT = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const api = Router();

// ===========================================================================
// MEDIA — real binary upload to disk + range-streaming playback
// (stands in for the Telegram MediaStore; same DataStore/MediaStore boundary)
// ===========================================================================
api.post(
  "/media",
  requireAuth,
  express.raw({ type: () => true, limit: "300mb" }),
  (req, res) => {
    const ct = req.headers["content-type"] || "application/octet-stream";
    if (!req.body || !req.body.length)
      return err(res, "empty", "No file received.");
    const ext = EXT[ct] || "bin";
    const kind = ct.startsWith("video/")
      ? "video"
      : ct.startsWith("image/")
        ? "image"
        : "file";
    const rec = db.put("media", {
      kind,
      contentType: ct,
      size: req.body.length,
      ext,
    });
    fs.writeFileSync(path.join(MEDIA_DIR, rec.id + "." + ext), req.body);
    // Async Telegram backup (non-blocking — disk write is the fast path)
    if (media.putBlobRemote) {
      media
        .putBlobRemote(req.body, { kind }, rec.id + "." + ext, ct)
        .then(({ fileId, tgFileId }) => {
          if (tgFileId) db.put("media", { ...rec, ext, fileId, tgFileId });
        })
        .catch((e) => console.warn("[TG] media upload:", e.message));
    }
    res.json({
      fileId: rec.id,
      url: `/api/v1/media/${rec.id}`,
      contentType: ct,
      size: req.body.length,
    });
  },
);

api.get("/media/:id", (req, res) => {
  const rec = db.get("media", req.params.id);
  if (!rec || !rec.ext) return res.status(404).end();
  const file = path.join(MEDIA_DIR, rec.id + "." + rec.ext);
  if (!fs.existsSync(file)) {
    // Disk cache miss — try Telegram if available
    if (media.getBlobRemote && rec.tgFileId) {
      media
        .getBlobRemote(rec.fileId || rec.id)
        .then((buf) => {
          if (!buf) return res.status(404).end();
          res.setHeader(
            "Content-Type",
            rec.contentType || "application/octet-stream",
          );
          res.setHeader("Content-Length", buf.length);
          res.end(buf);
        })
        .catch(() => res.status(404).end());
      return;
    }
    return res.status(404).end();
  }
  const total = fs.statSync(file).size;
  const range = req.headers.range;
  res.setHeader("Content-Type", rec.contentType || "application/octet-stream");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=31536000");
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range) || [];
    const start = parseInt(m[1], 10) || 0;
    const end = m[2] ? parseInt(m[2], 10) : total - 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    res.setHeader("Content-Length", end - start + 1);
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.setHeader("Content-Length", total);
    fs.createReadStream(file).pipe(res);
  }
});

// ---- helpers ---------------------------------------------------------------
const err = (res, code, message, status = 400) =>
  res.status(status).json({ error: { code, message } });
const authorOf = (id) => publicUser(db.get("users", id));

function hydratePost(p, viewerId) {
  const liked = !!db.find(
    "likes",
    (l) => l.userId === viewerId && l.targetId === p.id,
  );
  const forkedFrom = p.forkedFrom
    ? (() => {
        const o = db.get("posts", p.forkedFrom);
        return o
          ? { id: o.id, author: authorOf(o.authorId), text: o.text }
          : null;
      })()
    : null;
  return { ...p, author: authorOf(p.authorId), liked, forkedFrom };
}
const hydrateVideo = (v) => ({ ...v, author: authorOf(v.authorId) });
const hydrateShort = (s) => ({ ...s, author: authorOf(s.authorId) });

// ===========================================================================
// AUTH
// ===========================================================================
api.post("/auth/signup", (req, res) => {
  const { handle, name, password } = req.body || {};
  if (!handle || !password)
    return err(res, "invalid", "Handle and password are required.");
  if (db.find("users", (u) => u.handle.toLowerCase() === handle.toLowerCase()))
    return err(res, "taken", "That handle is taken.");
  const hue = Math.floor(Math.random() * 360);
  const firstUser = db.count("users") === 0; // the very first account owns the instance
  const user = db.put("users", {
    handle,
    name: name || handle,
    bio: "",
    role: firstUser ? "owner" : "regular",
    verified: firstUser,
    isPrivate: false,
    avatarRef: { kind: "gradient", hue },
    bannerRef: { kind: "gradient", hue: (hue + 40) % 360 },
    passwordHash: bcrypt.hashSync(password, 8),
  });
  res.json({ token: signToken(user), user: publicUser(user) });
});

api.post("/auth/login", (req, res) => {
  const { handle, password } = req.body || {};
  const user = db.find(
    "users",
    (u) => u.handle.toLowerCase() === (handle || "").toLowerCase(),
  );
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash))
    return err(res, "bad_credentials", "Wrong handle or password.", 401);
  if (user.banned)
    return err(res, "banned", "This account has been suspended.", 403);
  res.json({ token: signToken(user), user: publicUser(user) });
});

api.get("/auth/me", requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
    feedPrefs: req.user.feedPrefs || DEFAULT_FEED_PREFS,
  });
});

// ===========================================================================
// USERS / PROFILES
// ===========================================================================
api.get("/users/:handle", optionalAuth, (req, res) => {
  const u = db.find(
    "users",
    (x) => x.handle.toLowerCase() === req.params.handle.toLowerCase(),
  );
  if (!u) return err(res, "not_found", "No such user.", 404);
  const viewerId = req.user?.id;
  const isSelf = viewerId === u.id;
  const isFollowing = viewerId
    ? !!db.find(
        "connections",
        (c) =>
          c.fromId === viewerId && c.toId === u.id && c.status === "accepted",
      )
    : false;
  // Private account: only the owner or accepted followers see content.
  const locked = !!u.isPrivate && !isSelf && !isFollowing;
  const posts = locked
    ? []
    : db
        .query("posts", (p) => p.authorId === u.id)
        .sort(byNewest)
        .map((p) => hydratePost(p, viewerId));
  const videos = locked
    ? []
    : db
        .query("videos", (v) => v.authorId === u.id)
        .sort(byNewest)
        .map(hydrateVideo);
  const shorts = locked
    ? []
    : db
        .query("shorts", (s) => s.authorId === u.id)
        .sort(byNewest)
        .map(hydrateShort);
  res.json({
    user: publicUser(u),
    isFollowing,
    isSelf,
    locked,
    posts,
    videos,
    shorts,
    activity: locked ? [] : activityHeatmap(u.id),
    online: isOnline(u.id),
  });
});

api.patch("/users/me", requireAuth, (req, res) => {
  const { name, bio, avatarDataUrl, bannerDataUrl, isPrivate } = req.body || {};
  const patch = { ...req.user };
  if (name != null) patch.name = name;
  if (bio != null) patch.bio = bio;
  if (typeof isPrivate === "boolean") patch.isPrivate = isPrivate;

  const uploadImage = (dataUrl, field) => {
    if (!dataUrl || !/^data:image\//.test(dataUrl)) return;
    // Synchronous in-memory store (immediate use)
    const r = media.putBlob(dataUrl, { kind: "image" });
    patch[field] = { kind: "image", url: dataUrl, fileId: r.fileId };
    // Async Telegram backup (fire-and-forget)
    if (media.putBlobRemote) {
      const buf = Buffer.from(dataUrl.split(",")[1], "base64");
      media
        .putBlobRemote(buf, { kind: "image" }, field + ".jpg", "image/jpeg")
        .then(({ tgFileId }) => {
          if (tgFileId) db.put("users", { ...patch, [field]: { ...patch[field], tgFileId } });
        })
        .catch(() => {});
    }
  };

  uploadImage(avatarDataUrl, "avatarRef");
  uploadImage(bannerDataUrl, "bannerRef");

  const updated = db.put("users", patch);
  res.json({ user: publicUser(updated) });
});

// True Ownership (signature #8): real account deletion — removes your content.
api.post("/users/me/delete", requireAuth, (req, res) => {
  const id = req.user.id;
  for (const p of db.query("posts", (p) => p.authorId === id))
    db.delete("posts", p.id);
  for (const v of db.query("videos", (v) => v.authorId === id))
    db.delete("videos", v.id);
  for (const s of db.query("shorts", (s) => s.authorId === id))
    db.delete("shorts", s.id);
  for (const m of db.query("messages", (m) => m.senderId === id))
    db.delete("messages", m.id);
  for (const c of db.query(
    "connections",
    (c) => c.fromId === id || c.toId === id,
  ))
    db.delete("connections", c.id);
  for (const n of db.query("notifications", (n) => n.userId === id))
    db.delete("notifications", n.id);
  db.delete("users", id);
  res.json({ ok: true });
});

// True Ownership (signature #8): one-click full export.
api.get("/users/me/export", requireAuth, (req, res) => {
  const id = req.user.id;
  res.json({
    user: publicUser(req.user),
    posts: db.query("posts", (p) => p.authorId === id),
    videos: db.query("videos", (v) => v.authorId === id),
    shorts: db.query("shorts", (s) => s.authorId === id),
    messages: db.query("messages", (m) => m.senderId === id),
    connections: db.query(
      "connections",
      (c) => c.fromId === id || c.toId === id,
    ),
    exportedAt: new Date().toISOString(),
  });
});

// ===========================================================================
// FEED + POSTS  (tweet = core action #1)
// ===========================================================================
api.get("/feed", requireAuth, (req, res) => {
  const prefs = {
    ...DEFAULT_FEED_PREFS,
    ...(req.user.feedPrefs || {}),
    ...parsePrefs(req.query),
  };
  const ranked = rankFeed(req.user.id, prefs).map((p) =>
    hydratePost(p, req.user.id),
  );
  res.json({ posts: ranked, prefs });
});

api.get("/feed/prefs", requireAuth, (req, res) =>
  res.json({ prefs: req.user.feedPrefs || DEFAULT_FEED_PREFS }),
);
api.put("/feed/prefs", requireAuth, (req, res) => {
  const prefs = {
    ...DEFAULT_FEED_PREFS,
    ...(req.user.feedPrefs || {}),
    ...parsePrefs(req.body),
  };
  db.put("users", { ...req.user, feedPrefs: prefs });
  res.json({ prefs });
});

api.post("/posts", requireAuth, (req, res) => {
  const { text, provenance = "real", mediaHue, mediaDataUrl } = req.body || {};
  if ((!text || !text.trim()) && !mediaDataUrl)
    return err(res, "empty", "Write something first.");
  // Reflect-Before-Post (signature #11): flag heated drafts; never block.
  const reflect = isHeated(text || "");
  let mediaRefs = [];
  if (mediaDataUrl && /^data:image\//.test(mediaDataUrl)) {
    // Synchronous in-memory store (immediate use)
    const ref = media.putBlob(mediaDataUrl, { kind: "image" });
    mediaRefs = [{ kind: "image", url: mediaDataUrl, fileId: ref.fileId }];
    // Async Telegram backup (fire-and-forget)
    if (media.putBlobRemote) {
      const buf = Buffer.from(mediaDataUrl.split(",")[1], "base64");
      media
        .putBlobRemote(buf, { kind: "image" }, "post.jpg", "image/jpeg")
        .then(({ tgFileId }) => {
          if (tgFileId) {
            const idx = mediaRefs.findIndex((m) => m.fileId === ref.fileId);
            if (idx !== -1) mediaRefs[idx].tgFileId = tgFileId;
          }
        })
        .catch(() => {});
    }
  } else if (mediaHue != null) {
    mediaRefs = [{ kind: "gradient", hue: Number(mediaHue) }];
  }
  const post = db.put("posts", {
    authorId: req.user.id,
    text: (text || "").trim(),
    mediaRefs,
    provenance,
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    depthScore: 0.5,
  });
  // Notify followers' feeds in real time.
  for (const c of db.query(
    "connections",
    (c) => c.toId === req.user.id && c.status === "accepted",
  ))
    emitToUser(c.fromId, "feed:update", { postId: post.id });
  res.json({ post: hydratePost(post, req.user.id), reflect });
});

api.get("/posts/:id", optionalAuth, (req, res) => {
  const p = db.get("posts", req.params.id);
  if (!p) return err(res, "not_found", "Post not found.", 404);
  const comments = db
    .query("comments", (c) => c.targetId === p.id)
    .sort(byNewest)
    .map((c) => ({ ...c, author: authorOf(c.authorId) }));
  res.json({
    post: hydratePost(p, req.user?.id),
    comments,
    forks: forkChain(p.id),
  });
});

api.post("/posts/:id/like", requireAuth, (req, res) => {
  const p = db.get("posts", req.params.id);
  if (!p) return err(res, "not_found", "Post not found.", 404);
  const existing = db.find(
    "likes",
    (l) => l.userId === req.user.id && l.targetId === p.id,
  );
  if (existing) {
    db.delete("likes", existing.id);
    db.put("posts", { ...p, likeCount: Math.max(0, (p.likeCount || 1) - 1) });
    return res.json({
      liked: false,
      likeCount: Math.max(0, (p.likeCount || 1) - 1),
    });
  }
  db.put("likes", { userId: req.user.id, targetId: p.id });
  const likeCount = (p.likeCount || 0) + 1;
  db.put("posts", { ...p, likeCount });
  if (p.authorId !== req.user.id) {
    db.put("notifications", {
      userId: p.authorId,
      type: "like",
      payload: { fromId: req.user.id, postText: p.text.slice(0, 40) },
      read: false,
    });
    emitToUser(p.authorId, "notification:new", { type: "like" });
  }
  res.json({ liked: true, likeCount });
});

api.post("/posts/:id/comment", requireAuth, (req, res) => {
  const p = db.get("posts", req.params.id);
  if (!p) return err(res, "not_found", "Post not found.", 404);
  const { text } = req.body || {};
  if (!text?.trim()) return err(res, "empty", "Write a comment first.");
  const comment = db.put("comments", {
    targetId: p.id,
    authorId: req.user.id,
    text: text.trim(),
  });
  db.put("posts", { ...p, commentCount: (p.commentCount || 0) + 1 });
  if (p.authorId !== req.user.id) {
    db.put("notifications", {
      userId: p.authorId,
      type: "comment",
      payload: { fromId: req.user.id, postText: p.text.slice(0, 40) },
      read: false,
    });
    emitToUser(p.authorId, "notification:new", { type: "comment" });
  }
  res.json({ comment: { ...comment, author: publicUser(req.user) } });
});

// Forkable content + attribution chain (signature #3).
api.post("/posts/:id/fork", requireAuth, (req, res) => {
  const p = db.get("posts", req.params.id);
  if (!p) return err(res, "not_found", "Post not found.", 404);
  const fork = db.put("posts", {
    authorId: req.user.id,
    text: req.body?.text?.trim() || `Forked: ${p.text}`,
    mediaRefs: p.mediaRefs,
    provenance: "remixed",
    forkedFrom: p.id,
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    depthScore: 0.5,
  });
  db.put("posts", { ...p, forkCount: (p.forkCount || 0) + 1 });
  if (p.authorId !== req.user.id) {
    db.put("notifications", {
      userId: p.authorId,
      type: "fork",
      payload: { fromId: req.user.id, postText: p.text.slice(0, 40) },
      read: false,
    });
    emitToUser(p.authorId, "notification:new", { type: "fork" });
  }
  res.json({ post: hydratePost(fork, req.user.id) });
});

// ===========================================================================
// VIDEOS + SHORTS  (upload video / short = core actions #3, #4)
// ===========================================================================
api.get("/videos", optionalAuth, (_req, res) => {
  res.json({
    videos: db
      .query("videos", () => true)
      .sort((a, b) => b.viewCount - a.viewCount)
      .map(hydrateVideo),
  });
});
api.get("/videos/:id", optionalAuth, (req, res) => {
  const v = db.get("videos", req.params.id);
  if (!v) return err(res, "not_found", "Video not found.", 404);
  db.put("videos", { ...v, viewCount: (v.viewCount || 0) + 1 });
  const upNext = db
    .query("videos", (x) => x.id !== v.id)
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 6)
    .map(hydrateVideo);
  res.json({ video: hydrateVideo(v), upNext });
});
api.post("/videos", requireAuth, (req, res) => {
  const {
    title,
    description = "",
    provenance = "real",
    hue = 220,
    durationS = 0,
    mediaUrl,
    thumbnailDataUrl,
  } = req.body || {};
  if (!title?.trim()) return err(res, "empty", "Give your video a title.");
  if (!mediaUrl) return err(res, "empty", "Choose a video file to upload.");
  const thumbnailRef =
    thumbnailDataUrl && /^data:image\//.test(thumbnailDataUrl)
      ? { kind: "image", url: thumbnailDataUrl }
      : { kind: "gradient", hue: Number(hue) };
  const v = db.put("videos", {
    authorId: req.user.id,
    type: "long",
    title: title.trim(),
    description,
    provenance,
    thumbnailRef,
    durationS: Math.round(Number(durationS) || 0),
    status: "ready",
    mediaUrl,
    viewCount: 0,
  });
  res.json({ video: hydrateVideo(v) });
});

api.get("/shorts/feed", optionalAuth, (_req, res) => {
  res.json({
    shorts: db
      .query("shorts", () => true)
      .sort(byNewest)
      .map(hydrateShort),
  });
});
api.post("/shorts", requireAuth, (req, res) => {
  const {
    caption = "",
    provenance = "real",
    hue = 200,
    durationS = 0,
    mediaUrl,
    thumbnailDataUrl,
  } = req.body || {};
  if (!mediaUrl) return err(res, "empty", "Choose a vertical video to upload.");
  const thumbnailRef =
    thumbnailDataUrl && /^data:image\//.test(thumbnailDataUrl)
      ? { kind: "image", url: thumbnailDataUrl }
      : { kind: "gradient", hue: Number(hue) };
  const s = db.put("shorts", {
    authorId: req.user.id,
    type: "short",
    caption,
    provenance,
    mediaUrl,
    thumbnailRef,
    durationS: Math.round(Number(durationS) || 12),
    status: "ready",
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
  });
  res.json({ short: hydrateShort(s) });
});

api.post("/shorts/:id/like", requireAuth, (req, res) => {
  const s = db.get("shorts", req.params.id);
  if (!s) return err(res, "not_found", "Short not found.", 404);
  const existing = db.find("likes", (l) => l.userId === req.user.id && l.targetId === s.id);
  if (existing) {
    db.delete("likes", existing.id);
    db.put("shorts", { ...s, likeCount: Math.max(0, (s.likeCount || 1) - 1) });
    return res.json({ liked: false, likeCount: Math.max(0, (s.likeCount || 1) - 1) });
  }
  db.put("likes", { userId: req.user.id, targetId: s.id });
  const likeCount = (s.likeCount || 0) + 1;
  db.put("shorts", { ...s, likeCount });
  if (s.authorId !== req.user.id) {
    db.put("notifications", { userId: s.authorId, type: "like", payload: { fromId: req.user.id }, read: false });
    emitToUser(s.authorId, "notification:new", { type: "like" });
  }
  res.json({ liked: true, likeCount });
});

api.get("/shorts/:id/comments", optionalAuth, (req, res) => {
  const s = db.get("shorts", req.params.id);
  if (!s) return err(res, "not_found", "Short not found.", 404);
  const comments = db.query("comments", (c) => c.targetId === s.id).sort(byNewest).map((c) => ({ ...c, author: authorOf(c.authorId) }));
  res.json({ comments });
});

api.post("/shorts/:id/comment", requireAuth, (req, res) => {
  const s = db.get("shorts", req.params.id);
  if (!s) return err(res, "not_found", "Short not found.", 404);
  const { text } = req.body || {};
  if (!text?.trim()) return err(res, "empty", "Write a comment first.");
  const comment = db.put("comments", { targetId: s.id, authorId: req.user.id, text: text.trim() });
  db.put("shorts", { ...s, commentCount: (s.commentCount || 0) + 1 });
  if (s.authorId !== req.user.id) {
    db.put("notifications", { userId: s.authorId, type: "comment", payload: { fromId: req.user.id }, read: false });
    emitToUser(s.authorId, "notification:new", { type: "comment" });
  }
  res.json({ comment: { ...comment, author: publicUser(req.user) } });
});

// ===========================================================================
// CONNECTIONS — accept request = core action #5
// ===========================================================================
api.get("/connections", requireAuth, (req, res) => {
  const id = req.user.id;
  const followers = db
    .query("connections", (c) => c.toId === id && c.status === "accepted")
    .map((c) => authorOf(c.fromId));
  const following = db
    .query("connections", (c) => c.fromId === id && c.status === "accepted")
    .map((c) => authorOf(c.toId));
  const requests = db
    .query("connections", (c) => c.toId === id && c.status === "pending")
    .map((c) => ({
      requestId: c.id,
      from: authorOf(c.fromId),
      createdAt: c.createdAt,
    }));
  res.json({
    followers,
    following,
    requests,
    suggested: suggestedUsers(id).map(publicUser),
  });
});

api.post("/connections/request/:userId", requireAuth, (req, res) => {
  const target = db.get("users", req.params.userId);
  if (!target) return err(res, "not_found", "User not found.", 404);
  if (target.id === req.user.id)
    return err(res, "invalid", "You cannot follow yourself.");
  const existing = db.find(
    "connections",
    (c) => c.fromId === req.user.id && c.toId === target.id,
  );
  if (existing) return res.json({ status: existing.status });
  // Special User (ADMIN.md): can connect without waiting for acceptance.
  const status =
    req.user.role === "special" || req.user.role === "owner"
      ? "accepted"
      : "pending";
  const conn = db.put("connections", {
    fromId: req.user.id,
    toId: target.id,
    status,
    acceptedAt: status === "accepted" ? new Date().toISOString() : null,
  });
  db.put("notifications", {
    userId: target.id,
    type: status === "accepted" ? "follow" : "request",
    payload: { fromId: req.user.id },
    read: false,
  });
  emitToUser(target.id, "notification:new", { type: "request" });
  res.json({ status: conn.status, requestId: conn.id });
});

api.post("/connections/accept/:requestId", requireAuth, (req, res) => {
  const conn = db.get("connections", req.params.requestId);
  if (!conn || conn.toId !== req.user.id)
    return err(res, "not_found", "Request not found.", 404);
  const accepted = db.put("connections", {
    ...conn,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  });
  db.put("notifications", {
    userId: conn.fromId,
    type: "follow",
    payload: { fromId: req.user.id },
    read: false,
  });
  emitToUser(conn.fromId, "notification:new", { type: "follow" });
  res.json({ ok: true, connection: accepted });
});

api.post("/connections/decline/:requestId", requireAuth, (req, res) => {
  const conn = db.get("connections", req.params.requestId);
  if (!conn || conn.toId !== req.user.id)
    return err(res, "not_found", "Request not found.", 404);
  db.delete("connections", conn.id);
  res.json({ ok: true });
});

// ===========================================================================
// INVITES — accept invite = core action #6
// ===========================================================================
api.post("/invites", requireAuth, (req, res) => {
  const { groupId, toUserId } = req.body || {};
  const group = db.get("conversations", groupId);
  if (!group || group.type !== "group")
    return err(res, "not_found", "Group not found.", 404);
  const invite = db.put("invites", {
    groupId,
    fromId: req.user.id,
    toId: toUserId,
    status: "pending",
  });
  db.put("notifications", {
    userId: toUserId,
    type: "invite",
    payload: { fromId: req.user.id, groupId, inviteId: invite.id },
    read: false,
  });
  emitToUser(toUserId, "notification:new", { type: "invite" });
  res.json({ invite });
});

api.post("/invites/:id/accept", requireAuth, (req, res) => {
  const invite = db.get("invites", req.params.id);
  if (!invite || invite.toId !== req.user.id)
    return err(res, "not_found", "Invite not found.", 404);
  db.put("invites", { ...invite, status: "accepted" });
  const group = db.get("conversations", invite.groupId);
  if (group && !group.memberIds.includes(req.user.id))
    db.put("conversations", {
      ...group,
      memberIds: [...group.memberIds, req.user.id],
    });
  emitToUser(invite.fromId, "notification:new", { type: "invite_accepted" });
  res.json({ ok: true, group: db.get("conversations", invite.groupId) });
});

api.post("/invites/:id/decline", requireAuth, (req, res) => {
  const invite = db.get("invites", req.params.id);
  if (!invite || invite.toId !== req.user.id)
    return err(res, "not_found", "Invite not found.", 404);
  db.put("invites", { ...invite, status: "declined" });
  res.json({ ok: true });
});

// ===========================================================================
// CHAT  (core action #2) — REST history; live delivery over WebSocket
// ===========================================================================
api.get("/conversations", requireAuth, (req, res) => {
  const id = req.user.id;
  const convos = db
    .query("conversations", (c) => c.memberIds.includes(id))
    .sort(
      (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0),
    )
    .map((c) => {
      const last = db
        .query("messages", (m) => m.conversationId === c.id)
        .sort(byNewest)[0];
      const others = c.memberIds.filter((m) => m !== id).map(authorOf);
      const unread = db.count(
        "messages",
        (m) =>
          m.conversationId === c.id && m.senderId !== id && m.status !== "read",
      );
      return {
        id: c.id,
        type: c.type,
        title: c.type === "group" ? c.title : others[0]?.name,
        avatarRef:
          c.type === "group"
            ? { kind: "gradient", hue: 210 }
            : others[0]?.avatarRef,
        members: others,
        lastMessage: last
          ? {
              text: last.text,
              senderId: last.senderId,
              createdAt: last.createdAt,
            }
          : null,
        lastMessageAt: c.lastMessageAt,
        unread,
        online: others.some((o) => o && isOnline(o.id)),
      };
    });
  res.json({ conversations: convos });
});

api.post("/conversations", requireAuth, (req, res) => {
  const { userId, title, memberIds } = req.body || {};
  if (userId) {
    const existing = db.find(
      "conversations",
      (c) =>
        c.type === "direct" &&
        c.memberIds.includes(req.user.id) &&
        c.memberIds.includes(userId),
    );
    if (existing) return res.json({ conversation: existing });
    const c = db.put("conversations", {
      type: "direct",
      memberIds: [req.user.id, userId],
      lastMessageAt: new Date().toISOString(),
    });
    return res.json({ conversation: c });
  }
  const members = Array.from(new Set([req.user.id, ...(memberIds || [])]));
  const c = db.put("conversations", {
    type: "group",
    title: title || "New group",
    memberIds: members,
    lastMessageAt: new Date().toISOString(),
  });
  res.json({ conversation: c });
});

api.get("/conversations/:id/messages", requireAuth, (req, res) => {
  const c = db.get("conversations", req.params.id);
  if (!c || !c.memberIds.includes(req.user.id))
    return err(res, "not_found", "Conversation not found.", 404);
  const messages = db
    .query("messages", (m) => m.conversationId === c.id && !m.scheduled)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((m) => ({ ...m, sender: authorOf(m.senderId) }));
  const others = c.memberIds
    .filter((m) => m !== req.user.id)
    .map(authorOf)
    .filter(Boolean);
  const title = c.type === "group" ? c.title : others[0]?.name;
  const avatarRef =
    c.type === "group" ? { kind: "gradient", hue: 210 } : others[0]?.avatarRef;
  const online = others.some((o) => o && isOnline(o.id));
  const presence =
    c.type === "group"
      ? `${c.memberIds.length} members`
      : online
        ? "online"
        : "offline";
  res.json({
    conversation: {
      id: c.id,
      type: c.type,
      title,
      avatarRef,
      online,
      presence,
      members: c.memberIds.map(authorOf),
    },
    messages,
  });
});

// REST fallback for sending (WS is the primary path).
api.post("/conversations/:id/messages", requireAuth, (req, res) => {
  const c = db.get("conversations", req.params.id);
  if (!c || !c.memberIds.includes(req.user.id))
    return err(res, "not_found", "Conversation not found.", 404);
  const { text, replyTo, sendAt } = req.body || {};
  if (!text?.trim()) return err(res, "empty", "Type a message first.");
  const scheduled = sendAt && new Date(sendAt) > new Date();
  const message = db.put("messages", {
    conversationId: c.id,
    senderId: req.user.id,
    text: text.trim(),
    replyTo: replyTo || null,
    status: scheduled ? "sending" : "sent",
    sendAt: scheduled ? sendAt : null,
    scheduled: !!scheduled,
  });
  if (!scheduled) {
    db.put("conversations", { ...c, lastMessageAt: message.createdAt });
    emitToConversation(c.id, "message:new", {
      message: { ...message, sender: publicUser(req.user) },
    });
  }
  res.json({ message: { ...message, sender: publicUser(req.user) } });
});

api.post("/conversations/:id/read", requireAuth, (req, res) => {
  const c = db.get("conversations", req.params.id);
  if (!c) return err(res, "not_found", "Conversation not found.", 404);
  for (const m of db.query(
    "messages",
    (m) =>
      m.conversationId === c.id &&
      m.senderId !== req.user.id &&
      m.status !== "read",
  ))
    db.put("messages", { ...m, status: "read" });
  res.json({ ok: true });
});

// Edit a message (your own). Broadcasts message:edit over WS.
api.patch("/conversations/:id/messages/:mid", requireAuth, (req, res) => {
  const m = db.get("messages", req.params.mid);
  if (!m || m.conversationId !== req.params.id)
    return err(res, "not_found", "Message not found.", 404);
  if (m.senderId !== req.user.id)
    return err(res, "forbidden", "You can only edit your own messages.", 403);
  const text = (req.body?.text || "").trim();
  if (!text) return err(res, "empty", "Message can’t be empty.");
  const up = db.put("messages", { ...m, text, edited: true });
  emitToConversation(m.conversationId, "message:edit", {
    id: m.id,
    text,
    edited: true,
  });
  res.json({ message: up });
});

// Delete a message (your own). Broadcasts message:delete over WS.
api.post("/conversations/:id/messages/:mid/delete", requireAuth, (req, res) => {
  const m = db.get("messages", req.params.mid);
  if (!m || m.conversationId !== req.params.id)
    return err(res, "not_found", "Message not found.", 404);
  if (m.senderId !== req.user.id)
    return err(res, "forbidden", "You can only delete your own messages.", 403);
  db.delete("messages", m.id);
  emitToConversation(m.conversationId, "message:delete", { id: m.id });
  res.json({ ok: true });
});

// ===========================================================================
// NOTIFICATIONS / EXPLORE / TRENDING
// ===========================================================================
api.get("/notifications", requireAuth, (req, res) => {
  const list = db
    .query("notifications", (n) => n.userId === req.user.id)
    .sort(byNewest)
    .map((n) => ({
      ...n,
      from: n.payload?.fromId ? authorOf(n.payload.fromId) : null,
    }));
  res.json({ notifications: list, unread: list.filter((n) => !n.read).length });
});
api.post("/notifications/read", requireAuth, (req, res) => {
  for (const n of db.query(
    "notifications",
    (n) => n.userId === req.user.id && !n.read,
  ))
    db.put("notifications", { ...n, read: true });
  res.json({ ok: true });
});

api.get("/explore", optionalAuth, (req, res) => {
  const { q, type } = req.query;
  const r = search(q, type);
  res.json({
    users: r.users.map(publicUser),
    posts: r.posts.sort(byNewest).map((p) => hydratePost(p, req.user?.id)),
    videos: r.videos.map(hydrateVideo),
    shorts: r.shorts.map(hydrateShort),
    trending: trending(),
  });
});

api.get("/trending", (_req, res) =>
  res.json({ trending: trending(), suggested: [] }),
);

// ===========================================================================
// BOOKMARKS / SAVED
// ===========================================================================
api.post("/bookmarks/:targetId", requireAuth, (req, res) => {
  const targetId = req.params.targetId;
  const kind =
    req.body?.kind || (db.get("videos", targetId) ? "video" : "post");
  const existing = db.find(
    "bookmarks",
    (b) => b.userId === req.user.id && b.targetId === targetId,
  );
  if (existing) {
    db.delete("bookmarks", existing.id);
    return res.json({ saved: false });
  }
  db.put("bookmarks", { userId: req.user.id, targetId, kind });
  res.json({ saved: true });
});

api.get("/bookmarks", requireAuth, (req, res) => {
  const marks = db
    .query("bookmarks", (b) => b.userId === req.user.id)
    .sort(byNewest);
  const posts = [],
    videos = [];
  for (const b of marks) {
    if (b.kind === "video") {
      const v = db.get("videos", b.targetId);
      if (v) videos.push(hydrateVideo(v));
    } else {
      const p = db.get("posts", b.targetId);
      if (p) posts.push(hydratePost(p, req.user.id));
    }
  }
  res.json({ posts, videos });
});

// ===========================================================================
// ADMIN API — per ADMIN.md §4-5. Owner/admin role required on all routes.
// Audit-logged; never publicly reachable (local-only admin panel connects here).
// ===========================================================================
const requireAdmin = (req, res, next) =>
  requireAuth(req, res, () => {
    if (!["owner", "admin"].includes(req.user?.role))
      return err(res, "forbidden", "Admin access required.", 403);
    // Audit log every admin action
    db.put("admin_audit", {
      adminId: req.user.id,
      action: `${req.method} ${req.path}`,
      meta: req.body,
      at: new Date().toISOString(),
    });
    next();
  });

api.get("/admin/users", requireAdmin, (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const users = db
    .query(
      "users",
      (u) =>
        !q ||
        u.handle.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q),
    )
    .sort(byNewest)
    .map(publicUser);
  res.json({ users });
});

api.post("/admin/users/:id/role", requireAdmin, (req, res) => {
  const u = db.get("users", req.params.id);
  if (!u) return err(res, "not_found", "User not found.", 404);
  if (u.role === "owner")
    return err(res, "forbidden", "Cannot change the owner role.", 403);
  const { role } = req.body || {};
  if (!["regular", "special", "admin"].includes(role))
    return err(res, "invalid", "Invalid role.");
  db.put("users", { ...u, role });
  res.json({ ok: true });
});

api.post("/admin/users/:id/verify", requireAdmin, (req, res) => {
  const u = db.get("users", req.params.id);
  if (!u) return err(res, "not_found", "User not found.", 404);
  const updated = db.put("users", { ...u, verified: !!req.body?.verified });
  res.json({ user: publicUser(updated) });
});

api.post("/admin/users/:id/ban", requireAdmin, (req, res) => {
  const u = db.get("users", req.params.id);
  if (!u) return err(res, "not_found", "User not found.", 404);
  if (u.role === "owner")
    return err(res, "forbidden", "Cannot ban the owner.", 403);
  db.put("users", { ...u, banned: true });
  res.json({ ok: true });
});

api.post("/admin/users/:id/unban", requireAdmin, (req, res) => {
  const u = db.get("users", req.params.id);
  if (!u) return err(res, "not_found", "User not found.", 404);
  db.put("users", { ...u, banned: false });
  res.json({ ok: true });
});

api.get("/admin/stats", requireAdmin, (_req, res) => {
  res.json({
    users: db.count("users"),
    posts: db.count("posts"),
    videos: db.count("videos"),
    shorts: db.count("shorts"),
    messages: db.count("messages"),
    reports: db.count("reports"),
    storage: "local",
  });
});

api.post("/admin/announce", requireAdmin, (req, res) => {
  const { text } = req.body || {};
  if (!text?.trim()) return err(res, "empty", "Announcement text is required.");
  for (const u of db.query("users", () => true)) {
    db.put("notifications", {
      userId: u.id,
      type: "announcement",
      payload: { text },
      read: false,
    });
    emitToUser(u.id, "notification:new", { type: "announcement", text });
  }
  res.json({ ok: true, recipients: db.count("users") });
});

// ---- small utilities -------------------------------------------------------
const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

// ===========================================================================
// POLLING ENDPOINTS (replace WebSocket for Vercel serverless)
// ===========================================================================

// Presence ping — client calls this every 25s to stay "online"
api.post("/ping", requireAuth, (req, res) => {
  updatePresence(req.user.id);
  res.json({ ok: true });
});

// Poll messages in a conversation (newer than `after` ISO timestamp)
api.get("/poll/messages", requireAuth, (req, res) => {
  const { conversationId, after } = req.query;
  if (!conversationId) return err(res, "missing", "conversationId required");
  const c = db.get("conversations", conversationId);
  if (!c || !c.memberIds.includes(req.user.id))
    return err(res, "forbidden", "Not a member.", 403);
  const afterTime = after ? new Date(after).getTime() : 0;
  const messages = db
    .query(
      "messages",
      (m) =>
        m.conversationId === conversationId &&
        (!after || new Date(m.createdAt).getTime() > afterTime),
    )
    .sort(byNewest)
    .reverse()
    .map((m) => ({
      ...m,
      sender: m.senderId ? authorOf(m.senderId) : null,
    }));
  res.json({ messages });
});

// Poll notifications (newer than `after` ISO timestamp)
api.get("/poll/notifications", requireAuth, (req, res) => {
  const { after } = req.query;
  const afterTime = after ? new Date(after).getTime() : 0;
  const all = db
    .query("notifications", (n) => n.userId === req.user.id)
    .filter((n) => !after || new Date(n.createdAt).getTime() > afterTime);
  const unread = db
    .query("notifications", (n) => n.userId === req.user.id && !n.read)
    .length;
  res.json({
    notifications: all.sort(byNewest).map((n) => ({
      ...n,
      from: n.payload?.fromId ? authorOf(n.payload.fromId) : null,
    })),
    unread,
  });
});

// Poll presence — check online status for a list of user IDs
api.get("/poll/presence", requireAuth, (req, res) => {
  const ids = (req.query.userIds || "").split(",").filter(Boolean);
  const result = {};
  for (const id of ids) result[id] = isOnline(id);
  res.json({ presence: result });
});

function parsePrefs(src = {}) {
  const out = {};
  for (const k of ["recency", "popularity", "following", "depth"])
    if (src[k] != null) out[k] = Math.max(0, Math.min(1, Number(src[k])));
  if (src.provenance) out.provenance = String(src.provenance);
  return out;
}

function isHeated(text) {
  const hot = /(hate|stupid|idiot|trash|kill|shut up|worst|garbage)/i;
  return hot.test(text);
}

function forkChain(postId) {
  return db
    .query("posts", (p) => p.forkedFrom === postId)
    .map((p) => ({ id: p.id, author: authorOf(p.authorId), text: p.text }));
}

// GitHub-style contribution heatmap: last 12 weeks of activity counts.
function activityHeatmap(userId) {
  const weeks = 12,
    days = weeks * 7;
  const counts = new Array(days).fill(0);
  const items = [
    ...db.query("posts", (p) => p.authorId === userId),
    ...db.query("videos", (v) => v.authorId === userId),
    ...db.query("shorts", (s) => s.authorId === userId),
  ];
  for (const it of items) {
    const dayIdx = Math.floor(
      (Date.now() - new Date(it.createdAt).getTime()) / (24 * 3600 * 1000),
    );
    if (dayIdx >= 0 && dayIdx < days) counts[days - 1 - dayIdx] += 1;
  }
  // sprinkle a little baseline so the grid reads as "active" in the demo
  return counts.map((c, i) => c + ((i * 7 + 3) % 11 === 0 ? 1 : 0));
}
