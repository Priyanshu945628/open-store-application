// Open Store — Local Algorithms (no external AI APIs)
// Signature feature #1: the "Open Algorithm" — user-tunable, transparent ranking
// with a "Why am I seeing this?" label on every item. Also: trending + search.

import { db } from './store.js';

const HOUR = 3600 * 1000;

/** Default feed-control sliders (0..1). The user can override these. */
export const DEFAULT_FEED_PREFS = {
  recency: 0.6,     // fresh vs evergreen
  popularity: 0.5,  // viral vs niche
  following: 0.7,   // people I follow vs discovery
  depth: 0.5,       // reward saves/forks/read-time over reflex likes
  provenance: 'all', // all | real | ai | remixed  (Authenticity filter)
};

function recencyScore(createdAt) {
  const ageH = (Date.now() - new Date(createdAt).getTime()) / HOUR;
  return 1 / (1 + ageH / 12); // halves roughly every 12h
}

function popularityScore(p) {
  const engagement = (p.likeCount || 0) + 3 * (p.commentCount || 0) + 5 * (p.repostCount || 0);
  return Math.log10(1 + engagement) / 5; // ~0..1 across realistic ranges
}

/**
 * Rank posts for a viewer using their feed prefs.
 * Returns posts with a `_score` and a human "why" label — the transparency promise.
 */
export function rankFeed(viewerId, prefs = DEFAULT_FEED_PREFS) {
  const followingIds = new Set(
    db.query('connections', (c) => c.fromId === viewerId && c.status === 'accepted').map((c) => c.toId)
  );

  let posts = db.query('posts', (p) => !p.forkCountOnly);
  if (prefs.provenance && prefs.provenance !== 'all') {
    posts = posts.filter((p) => (p.provenance || 'real') === prefs.provenance);
  }

  const ranked = posts.map((p) => {
    const isFollowed = followingIds.has(p.authorId);
    const rec = recencyScore(p.createdAt);
    const pop = popularityScore(p);
    const depth = p.depthScore || 0;
    const follow = isFollowed ? 1 : 0.25;

    const score =
      prefs.recency * rec +
      prefs.popularity * pop +
      prefs.following * follow +
      prefs.depth * depth;

    // "Why am I seeing this?" — pick the dominant reason.
    const reasons = [
      { k: isFollowed ? `Because you follow @${db.get('users', p.authorId)?.handle}` : null, w: prefs.following * follow },
      { k: rec > 0.6 ? 'Because it’s fresh right now' : null, w: prefs.recency * rec },
      { k: pop > 0.5 ? 'Because it’s popular today' : null, w: prefs.popularity * pop },
      { k: depth > 0.7 ? 'Because it has high depth (saves & forks)' : null, w: prefs.depth * depth },
    ].filter((r) => r.k).sort((a, b) => b.w - a.w);

    return { ...p, _score: score, why: reasons[0]?.k || 'Suggested for you' };
  });

  return ranked.sort((a, b) => b._score - a._score);
}

/** Trending hashtags, computed live from real posts (recency-weighted counts). */
export function trending(limit = 6) {
  const tally = new Map();
  for (const p of db.query('posts', () => true)) {
    const tags = (p.text || '').match(/#([a-z0-9_]+)/gi) || [];
    const weight = recencyScore(p.createdAt) + 0.2;
    for (const raw of tags) {
      const tag = raw.slice(1).toLowerCase();
      tally.set(tag, (tally.get(tag) || 0) + weight);
    }
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, score]) => ({ tag, hotScore: Math.round(score * 20) }));
}

/** Who-to-follow: accounts you don't follow yet, ranked by follower count. */
export function suggestedUsers(viewerId, limit = 4) {
  const following = new Set(
    db.query('connections', (c) => c.fromId === viewerId && c.status === 'accepted').map((c) => c.toId)
  );
  return db.query('users', (u) => u.id !== viewerId && !following.has(u.id))
    .map((u) => ({ u, followers: db.count('connections', (c) => c.toId === u.id && c.status === 'accepted') }))
    .sort((a, b) => b.followers - a.followers)
    .slice(0, limit)
    .map((x) => x.u);
}

/** Search across people, posts, videos, shorts (full-text-ish + handle/tag). */
export function search(q, type = 'all') {
  const needle = (q || '').toLowerCase().replace(/^#|^@/, '').trim();
  if (!needle) return { users: [], posts: [], videos: [], shorts: [] };
  const has = (s) => (s || '').toLowerCase().includes(needle);

  const users = db.query('users', (u) => has(u.name) || has(u.handle) || has(u.bio));
  const posts = db.query('posts', (p) => has(p.text));
  const videos = db.query('videos', (v) => has(v.title) || has(v.description));
  const shorts = db.query('shorts', (s) => has(s.caption));

  if (type === 'people') return { users, posts: [], videos: [], shorts: [] };
  if (type === 'videos') return { users: [], posts: [], videos, shorts: [] };
  if (type === 'shorts') return { users: [], posts: [], videos: [], shorts };
  if (type === 'posts') return { users: [], posts, videos: [], shorts: [] };
  return { users, posts, videos, shorts };
}
