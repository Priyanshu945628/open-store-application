import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { downloadDatabase, uploadDatabase } from './github-service.js';

let db;

let backupTimeout = null;
function queueDatabaseBackup() {
  if (backupTimeout) clearTimeout(backupTimeout);
  backupTimeout = setTimeout(async () => {
    try {
      await uploadDatabase();
    } catch (err) {
      console.error('[Database Backup] Failed to back up SQLite database to GitHub:', err.message);
    }
  }, 1000);
}

export async function initDb() {
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  
  // Try to download existing database from GitHub first
  await downloadDatabase();
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Wrap db.run to automatically backup database on writes
  const originalRun = db.run.bind(db);
  db.run = async (...args) => {
    const result = await originalRun(...args);
    queueDatabaseBackup();
    return result;
  };

  // Create tables if they do not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      niche TEXT DEFAULT 'Web Development',
      name TEXT DEFAULT "",
      description TEXT DEFAULT "",
      tag TEXT DEFAULT "",
      socialUrl TEXT DEFAULT "",
      defaultPlaybackQuality TEXT DEFAULT "Auto",
      mediaCompression TEXT DEFAULT "Balanced",
      autoplayCaptions INTEGER DEFAULT 1,
      totp_secret TEXT DEFAULT NULL,
      totp_enabled INTEGER DEFAULT 0,
      email TEXT DEFAULT "",
      otp_code TEXT DEFAULT NULL,
      otp_expires INTEGER DEFAULT NULL,
      is_verified INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'log', 'vault', 'source'
      content TEXT,
      mediaUrl TEXT,      -- filename of the encrypted media file in storage
      mediaName TEXT,     -- original filename
      mediaType TEXT,     -- mime type
      githubRepo TEXT,    -- e.g., 'facebook/react' or 'https://mysite.com'
      niche TEXT,
      tags TEXT,
      views INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      UNIQUE(postId, userId),
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      parentId INTEGER DEFAULT NULL, -- self-referencing ID for comment replies
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parentId) REFERENCES comments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      followerId INTEGER NOT NULL,
      followedId INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      UNIQUE(followerId, followedId),
      FOREIGN KEY (followerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (followedId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'text' or 'image'
      mediaUrl TEXT,
      content TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId INTEGER NOT NULL,
      receiverId INTEGER NOT NULL,
      content TEXT,
      mediaUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      postId INTEGER DEFAULT NULL,
      isRead INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS banned_ips (
      ip TEXT PRIMARY KEY,
      bannedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS support_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      username TEXT,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Run dynamic schema migrations on columns in case tables already existed
  try {
    await db.exec('ALTER TABLE users ADD COLUMN niche TEXT DEFAULT "Web Development"');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN name TEXT DEFAULT ""');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN description TEXT DEFAULT ""');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN tag TEXT DEFAULT ""');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN socialUrl TEXT DEFAULT ""');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN defaultPlaybackQuality TEXT DEFAULT "Auto"');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN mediaCompression TEXT DEFAULT "Balanced"');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN autoplayCaptions INTEGER DEFAULT 1');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN email TEXT DEFAULT ""');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN otp_code TEXT DEFAULT NULL');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN otp_expires INTEGER DEFAULT NULL');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 1');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE posts ADD COLUMN niche TEXT');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE posts ADD COLUMN tags TEXT');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE posts ADD COLUMN collaboratorId INTEGER DEFAULT NULL');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec('ALTER TABLE comments ADD COLUMN parentId INTEGER DEFAULT NULL');
  } catch (e) { /* Column already exists */ }

  try {
    await db.exec("ALTER TABLE follows ADD COLUMN status TEXT DEFAULT 'pending'");
  } catch (e) { /* Column already exists */ }

  try {
    await db.run("UPDATE posts SET type = 'log' WHERE type = 'tweet'");
  } catch (e) { /* ignore */ }
  try {
    await db.run("UPDATE posts SET type = 'vault' WHERE type = 'media'");
  } catch (e) { /* ignore */ }

  console.log('[Database] SQLite Database initialized with rebranded schemas.');

  // Create default demo users if they don't exist
  // const demoUser = await db.get('SELECT * FROM users WHERE username = ?', ['dev_friend']);
  // if (!demoUser) {
  //   await db.run(
  //     'INSERT INTO users (username, password, avatar, niche) VALUES (?, ?, ?, ?)',
  //     ['dev_friend', 'password123', 'https://api.dicebear.com/7.x/bottts/svg?seed=dev_friend', 'Web Development']
  //   );
  //   await db.run(
  //     'INSERT INTO users (username, password, avatar, niche) VALUES (?, ?, ?, ?)',
  //     ['code_ninja', 'password123', 'https://api.dicebear.com/7.x/bottts/svg?seed=code_ninja', 'AI & Data Science']
  //   );
  //   console.log('[Database] Created default demo users (dev_friend, code_ninja).');
  // }

  // Initial backup of the database to GitHub
  await uploadDatabase();
}

// --- User Queries ---
export async function createUser(username, password, email = "") {
  try {
    const avatar = '';
    const isVerified = email ? 0 : 1;
    const result = await db.run(
      'INSERT INTO users (username, password, avatar, email, is_verified) VALUES (?, ?, ?, ?, ?)',
      [username, password, avatar, email, isVerified]
    );
    return { 
      id: result.lastID, 
      username, 
      email,
      name: "",
      avatar, 
      niche: 'Web Development',
      description: "",
      tag: "",
      socialUrl: "",
      defaultPlaybackQuality: "Auto",
      mediaCompression: "Balanced",
      autoplayCaptions: 1,
      totp_enabled: 0,
      is_verified: isVerified
    };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Username already exists');
    }
    throw error;
  }
}

export async function loginUser(username, password) {
  const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  if (!user) {
    throw new Error('Invalid username or password');
  }
  return { 
    id: user.id, 
    username: user.username, 
    email: user.email || "",
    name: user.name || "",
    avatar: user.avatar, 
    niche: user.niche,
    description: user.description || "",
    tag: user.tag || "",
    socialUrl: user.socialUrl || "",
    defaultPlaybackQuality: user.defaultPlaybackQuality || "Auto",
    mediaCompression: user.mediaCompression || "Balanced",
    autoplayCaptions: user.autoplayCaptions ?? 1,
    totp_enabled: user.totp_enabled ?? 0,
    is_verified: user.is_verified ?? 1
  };
}

export async function isUsernameTaken(username) {
  const row = await db.get('SELECT id FROM users WHERE username = ?', [username]);
  return !!row;
}

export async function updateUserSettings(userId, { 
  username, name = "", avatar, niche, 
  description = "", tag = "", socialUrl = "", 
  defaultPlaybackQuality = "Auto", mediaCompression = "Balanced", 
  autoplayCaptions = 1 
}) {
  await db.run(
    `UPDATE users SET 
      username = ?, name = ?, avatar = ?, niche = ?, 
      description = ?, tag = ?, socialUrl = ?, 
      defaultPlaybackQuality = ?, mediaCompression = ?, 
      autoplayCaptions = ? 
     WHERE id = ?`,
    [
      username, name, avatar, niche, 
      description, tag, socialUrl, 
      defaultPlaybackQuality, mediaCompression, 
      autoplayCaptions ? 1 : 0, userId
    ]
  );
  return getUserById(userId);
}

export async function getUserById(userId) {
  return db.get(`
    SELECT id, username, email, name, avatar, niche, description, tag, socialUrl, 
           defaultPlaybackQuality, mediaCompression, autoplayCaptions, totp_enabled, is_verified 
    FROM users WHERE id = ?
  `, [userId]);
}

export async function getUserTotpSecret(userId) {
  const row = await db.get('SELECT totp_secret FROM users WHERE id = ?', [userId]);
  return row ? row.totp_secret : null;
}

export async function updateUserTotp(userId, secret, enabled) {
  await db.run('UPDATE users SET totp_secret = ?, totp_enabled = ? WHERE id = ?', [secret, enabled ? 1 : 0, userId]);
  return getUserById(userId);
}

// --- Follow Queries ---
export async function toggleFollow(followerId, followedId) {
  if (followerId === followedId) {
    throw new Error('You cannot follow yourself');
  }
  const existing = await db.get('SELECT * FROM follows WHERE followerId = ? AND followedId = ?', [followerId, followedId]);
  if (existing) {
    await db.run('DELETE FROM follows WHERE followerId = ? AND followedId = ?', [followerId, followedId]);
    await db.run("DELETE FROM notifications WHERE userId = ? AND senderId = ? AND (type = 'follow_request' OR type = 'follow_accept')", [followedId, followerId]);
    return { followed: false };
  } else {
    await db.run("INSERT INTO follows (followerId, followedId, status) VALUES (?, ?, 'pending')", [followerId, followedId]);
    const follower = await getUserById(followerId);
    if (follower) {
      await createNotification(followedId, followerId, 'follow_request', `@${follower.username} wants to follow you`);
    }
    return { followed: true, status: 'pending' };
  }
}

export async function isFollowing(followerId, followedId) {
  const row = await db.get('SELECT id FROM follows WHERE followerId = ? AND followedId = ?', [followerId, followedId]);
  return !!row;
}

export async function getFollowedUsers(userId) {
  return db.all(`
    SELECT u.id, u.username, u.avatar, u.niche, f.status
    FROM users u
    JOIN follows f ON u.id = f.followedId
    WHERE f.followerId = ?
  `, [userId]);
}

export async function getFollowers(userId) {
  return db.all(`
    SELECT u.id, u.username, u.avatar, u.niche, f.status
    FROM users u
    JOIN follows f ON u.id = f.followerId
    WHERE f.followedId = ?
  `, [userId]);
}

export async function acceptFollow(followerId, followedId) {
  await db.run(
    "UPDATE follows SET status = 'accepted' WHERE followerId = ? AND followedId = ?",
    [followerId, followedId]
  );
  await db.run(
    "DELETE FROM notifications WHERE userId = ? AND senderId = ? AND type = 'follow_request'",
    [followedId, followerId]
  );
  const followed = await getUserById(followedId);
  if (followed) {
    await createNotification(followerId, followedId, 'follow_accept', `@${followed.username} accepted your follow request`);
  }
}

export async function declineFollow(followerId, followedId) {
  await db.run(
    "DELETE FROM follows WHERE followerId = ? AND followedId = ?",
    [followerId, followedId]
  );
  await db.run(
    "DELETE FROM notifications WHERE userId = ? AND senderId = ? AND type = 'follow_request'",
    [followedId, followerId]
  );
}

export async function canChat(userA, userB) {
  const row = await db.get(`
    SELECT id FROM follows 
    WHERE ((followerId = ? AND followedId = ?) OR (followerId = ? AND followedId = ?))
      AND status = 'accepted'
  `, [userA, userB, userB, userA]);
  return !!row;
}

export async function getChatContacts(userId) {
  return db.all(`
    SELECT DISTINCT u.id, u.username, u.avatar, u.niche, 
      CASE 
        WHEN f1.status IS NOT NULL THEN f1.status
        WHEN f2.status = 'accepted' THEN 'accepted'
        ELSE 'pending'
      END as status
    FROM users u
    LEFT JOIN follows f1 ON f1.followedId = u.id AND f1.followerId = ?
    LEFT JOIN follows f2 ON f2.followerId = u.id AND f2.followedId = ?
    WHERE f1.id IS NOT NULL OR f2.status = 'accepted'
  `, [userId, userId]);
}

// --- Post & Personalization Queries ---
export async function createPost({ userId, type, content, mediaUrl, mediaName, mediaType, githubRepo, niche = null, tags = null, collaboratorId = null }) {
  let postNiche = niche;
  if (!postNiche) {
    const user = await getUserById(userId);
    postNiche = user ? user.niche : 'Web Development';
  }

  const result = await db.run(
    `INSERT INTO posts (userId, type, content, mediaUrl, mediaName, mediaType, githubRepo, niche, tags, collaboratorId) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, content, mediaUrl, mediaName, mediaType, githubRepo, postNiche, tags, collaboratorId]
  );
  return getPostById(result.lastID, userId);
}

export async function getPostById(postId, currentUserId = null) {
  const query = `
    SELECT p.*, u.username, u.avatar,
           collab.username as collaboratorName,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
           (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked,
           (SELECT COUNT(*) FROM follows WHERE followerId = ? AND followedId = p.userId) as isFollowing
    FROM posts p
    JOIN users u ON p.userId = u.id
    LEFT JOIN users collab ON p.collaboratorId = collab.id
    WHERE p.id = ?
  `;
  return db.get(query, [currentUserId, currentUserId, postId]);
}

export async function getAllPosts(currentUserId = null) {
  // Personalization: rank posts that match the current user's niche higher
  let niche = null;
  if (currentUserId) {
    const user = await getUserById(currentUserId);
    niche = user ? user.niche : null;
  }

  let query;
  let params;

  if (niche) {
    query = `
      SELECT p.*, u.username, u.avatar,
             collab.username as collaboratorName,
             (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
             (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount,
             (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked,
             (SELECT COUNT(*) FROM follows WHERE followerId = ? AND followedId = p.userId) as isFollowing
      FROM posts p
      JOIN users u ON p.userId = u.id
      LEFT JOIN users collab ON p.collaboratorId = collab.id
      ORDER BY 
        CASE WHEN p.niche = ? THEN 0 ELSE 1 END ASC,
        p.createdAt DESC
    `;
    params = [currentUserId, currentUserId, niche];
  } else {
    query = `
      SELECT p.*, u.username, u.avatar,
             collab.username as collaboratorName,
             (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
             (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount,
             (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked,
             (SELECT COUNT(*) FROM follows WHERE followerId = ? AND followedId = p.userId) as isFollowing
      FROM posts p
      JOIN users u ON p.userId = u.id
      LEFT JOIN users collab ON p.collaboratorId = collab.id
      ORDER BY p.createdAt DESC
    `;
    params = [currentUserId, currentUserId];
  }

  return db.all(query, params);
}

export async function getPostsByUserId(userId, currentUserId = null) {
  const query = `
    SELECT p.*, u.username, u.avatar,
           collab.username as collaboratorName,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
           (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked,
           (SELECT COUNT(*) FROM follows WHERE followerId = ? AND followedId = p.userId) as isFollowing
    FROM posts p
    JOIN users u ON p.userId = u.id
    LEFT JOIN users collab ON p.collaboratorId = collab.id
    WHERE p.userId = ?
    ORDER BY p.createdAt DESC
  `;
  return db.all(query, [currentUserId, currentUserId, userId]);
}

// --- Like Queries ---
export async function toggleLike(postId, userId) {
  const existing = await db.get('SELECT * FROM likes WHERE postId = ? AND userId = ?', [postId, userId]);
  if (existing) {
    await db.run('DELETE FROM likes WHERE postId = ? AND userId = ?', [postId, userId]);
    return { liked: false };
  } else {
    await db.run('INSERT INTO likes (postId, userId) VALUES (?, ?)', [postId, userId]);
    // Create notification
    const post = await getPostById(postId);
    if (post && post.userId !== userId) {
      const liker = await getUserById(userId);
      if (liker) {
        await createNotification(post.userId, userId, 'like', `@${liker.username} liked your release`, postId);
      }
    }
    return { liked: true };
  }
}

export async function addComment(postId, userId, content, parentId = null) {
  const result = await db.run(
    'INSERT INTO comments (postId, userId, content, parentId) VALUES (?, ?, ?, ?)',
    [postId, userId, content, parentId]
  );
  
  const commenter = await getUserById(userId);
  if (commenter) {
    if (parentId) {
      const parentComment = await getCommentById(parentId);
      if (parentComment && parentComment.userId !== userId) {
        await createNotification(parentComment.userId, userId, 'comment', `@${commenter.username} replied to your comment`, postId);
      }
    } else {
      const post = await getPostById(postId);
      if (post && post.userId !== userId) {
        await createNotification(post.userId, userId, 'comment', `@${commenter.username} commented on your release`, postId);
      }
    }
  }
  return getCommentById(result.lastID);
}

export async function getCommentById(commentId) {
  const query = `
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.userId = u.id
    WHERE c.id = ?
  `;
  return db.get(query, [commentId]);
}

export async function getCommentsForPost(postId) {
  const query = `
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.userId = u.id
    WHERE c.postId = ?
    ORDER BY c.createdAt ASC
  `;
  return db.all(query, [postId]);
}

// Get all comments on a creator's own posts (for moderation dashboard)
export async function getChannelComments(creatorId) {
  return db.all(`
    SELECT c.*, u.username, u.avatar, p.content as postContent, p.id as postId
    FROM comments c
    JOIN users u ON c.userId = u.id
    JOIN posts p ON c.postId = p.id
    WHERE p.userId = ?
    ORDER BY c.createdAt DESC
    LIMIT 200
  `, [creatorId]);
}

// Delete a comment (only by post creator or comment author)
export async function deleteComment(commentId, requestingUserId) {
  const comment = await db.get(`
    SELECT c.*, p.userId as postOwnerId
    FROM comments c
    JOIN posts p ON c.postId = p.id
    WHERE c.id = ?
  `, [commentId]);
  if (!comment) throw new Error('Comment not found');
  if (comment.userId !== requestingUserId && comment.postOwnerId !== requestingUserId) {
    throw new Error('Not authorized to delete this comment');
  }
  await db.run('DELETE FROM comments WHERE id = ?', [commentId]);
  return { deleted: true };
}

// --- Search Algorithm Queries ---
export async function searchUsersAndVideos(searchQuery, currentUserId = null) {
  // Fuzzy username or niche match
  const users = await db.all(`
    SELECT id, username, avatar, niche,
           (SELECT COUNT(*) FROM follows WHERE followerId = ? AND followedId = users.id) as isFollowing,
           (SELECT status FROM follows WHERE followerId = ? AND followedId = users.id) as followStatus
    FROM users
    WHERE username LIKE ? OR niche LIKE ?
  `, [currentUserId, currentUserId, `%${searchQuery}%`, `%${searchQuery}%`]);

  // Video search based on title/content or file name (restricted to media type video/*)
  const videos = await db.all(`
    SELECT p.*, u.username, u.avatar,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
           (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked
    FROM posts p
    JOIN users u ON p.userId = u.id
    WHERE (p.content LIKE ? OR p.mediaName LIKE ?) 
      AND p.mediaType LIKE 'video/%'
    ORDER BY p.createdAt DESC
  `, [currentUserId, `%${searchQuery}%`, `%${searchQuery}%`]);

  // General posts search for the search results dashboard
  const posts = await db.all(`
    SELECT p.*, u.username, u.avatar,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likesCount,
           (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentsCount,
           (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked,
           (SELECT COUNT(*) FROM follows WHERE followerId = ? AND followedId = p.userId) as isFollowing
    FROM posts p
    JOIN users u ON p.userId = u.id
    WHERE p.content LIKE ? OR p.mediaName LIKE ? OR p.githubRepo LIKE ?
    ORDER BY p.createdAt DESC
  `, [currentUserId, currentUserId, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

  return { users, videos, posts };
}

// --- Stories Queries ---
export async function addStory(userId, type, mediaUrl, content = null) {
  const result = await db.run(
    'INSERT INTO stories (userId, type, mediaUrl, content) VALUES (?, ?, ?, ?)',
    [userId, type, mediaUrl, content]
  );
  return getStoryById(result.lastID);
}

export async function getStoryById(storyId) {
  return db.get(`
    SELECT s.*, u.username, u.avatar
    FROM stories s
    JOIN users u ON s.userId = u.id
    WHERE s.id = ?
  `, [storyId]);
}

export async function getActiveStories() {
  return db.all(`
    SELECT s.*, u.username, u.avatar
    FROM stories s
    JOIN users u ON s.userId = u.id
    WHERE s.createdAt >= datetime('now', '-24 hours')
    ORDER BY s.createdAt DESC
  `);
}

export async function deleteExpiredStories() {
  const expired = await db.all("SELECT id, mediaUrl FROM stories WHERE createdAt < datetime('now', '-24 hours')");
  await db.run("DELETE FROM stories WHERE createdAt < datetime('now', '-24 hours')");
  return expired;
}

// --- Messaging Queries (DMs) ---
export async function sendMessage(senderId, receiverId, content, mediaUrl = null) {
  const result = await db.run(
    'INSERT INTO messages (senderId, receiverId, content, mediaUrl) VALUES (?, ?, ?, ?)',
    [senderId, receiverId, content, mediaUrl]
  );
  return getMessageById(result.lastID);
}

export async function getMessageById(messageId) {
  return db.get(`
    SELECT m.*, u.username as senderName, u.avatar as senderAvatar
    FROM messages m
    JOIN users u ON m.senderId = u.id
    WHERE m.id = ?
  `, [messageId]);
}

export async function getDirectMessages(userA, userB) {
  return db.all(`
    SELECT m.*, u.username as senderName, u.avatar as senderAvatar
    FROM messages m
    JOIN users u ON m.senderId = u.id
    WHERE (m.senderId = ? AND m.receiverId = ?)
       OR (m.senderId = ? AND m.receiverId = ?)
    ORDER BY m.createdAt ASC
  `, [userA, userB, userB, userA]);
}

// --- Views & Analytics ---
export async function incrementPostViews(postId) {
  return db.run('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
}

// Get detailed stats for a user profile
export async function getUserProfileStats(userId) {
  const postsCount = await db.get('SELECT COUNT(*) as count FROM posts WHERE userId = ?', [userId]);
  const likesCount = await db.get('SELECT COUNT(*) as count FROM likes WHERE postId IN (SELECT id FROM posts WHERE userId = ?)', [userId]);
  const viewsCount = await db.get('SELECT SUM(views) as count FROM posts WHERE userId = ?', [userId]);
  const videosCount = await db.get('SELECT COUNT(*) as count FROM posts WHERE userId = ? AND mediaType LIKE "video/%"', [userId]);
  
  const followersCount = await db.get('SELECT COUNT(*) as count FROM follows WHERE followedId = ?', [userId]);
  const followingCount = await db.get('SELECT COUNT(*) as count FROM follows WHERE followerId = ?', [userId]);

  return {
    postsCount: postsCount?.count || 0,
    likesCount: likesCount?.count || 0,
    viewsCount: viewsCount?.count || 0,
    videosCount: videosCount?.count || 0,
    followersCount: followersCount?.count || 0,
    followingCount: followingCount?.count || 0
  };
}

// --- Notifications Queries ---
export async function createNotification(userId, senderId, type, message, postId = null) {
  if (userId === senderId) return null;
  const result = await db.run(
    'INSERT INTO notifications (userId, senderId, type, message, postId) VALUES (?, ?, ?, ?, ?)',
    [userId, senderId, type, message, postId]
  );
  return result.lastID;
}

export async function getNotifications(userId) {
  return db.all(`
    SELECT n.*, u.username as senderName, u.avatar as senderAvatar
    FROM notifications n
    JOIN users u ON n.senderId = u.id
    WHERE n.userId = ?
    ORDER BY n.createdAt DESC
  `, [userId]);
}

export async function clearNotifications(userId) {
  return db.run('DELETE FROM notifications WHERE userId = ?', [userId]);
}

// --- Banned IPs Helpers ---
export async function isIpBanned(ip) {
  const row = await db.get('SELECT ip FROM banned_ips WHERE ip = ?', [ip]);
  return !!row;
}

export async function banIp(ip) {
  await db.run('INSERT OR IGNORE INTO banned_ips (ip) VALUES (?)', [ip]);
}

export async function unbanIp(ip) {
  await db.run('DELETE FROM banned_ips WHERE ip = ?', [ip]);
}

export async function getBannedIps() {
  return db.all('SELECT ip, bannedAt FROM banned_ips ORDER BY bannedAt DESC');
}

export async function getAllUsers() {
  return db.all('SELECT id, username, name, avatar, niche, description, tag, socialUrl FROM users');
}

export async function updateUserOtp(userId, otpCode, otpExpires) {
  await db.run('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?', [otpCode, otpExpires, userId]);
}

export async function verifyUserOtp(userId, otpCode) {
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error('User not found');
  if (!user.otp_code || user.otp_code !== otpCode) {
    throw new Error('Invalid OTP code');
  }
  if (Date.now() > user.otp_expires) {
    throw new Error('OTP code has expired');
  }
  await db.run('UPDATE users SET otp_code = NULL, otp_expires = NULL, is_verified = 1 WHERE id = ?', [userId]);
  return getUserById(userId);
}

export async function getUserByEmailOrUsername(identifier) {
  return await db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [identifier, identifier]
  );
}

export async function resetUserPassword(userId, newPassword) {
  await db.run(
    'UPDATE users SET password = ?, otp_code = NULL, otp_expires = NULL, is_verified = 1 WHERE id = ?',
    [newPassword, userId]
  );
}

export async function revokeUserAccount(userId) {
  await db.run('PRAGMA foreign_keys = ON');
  await db.run('DELETE FROM likes WHERE userId = ?', [userId]);
  await db.run('DELETE FROM comments WHERE userId = ?', [userId]);
  await db.run('DELETE FROM follows WHERE followerId = ? OR followedId = ?', [userId, userId]);
  await db.run('DELETE FROM stories WHERE userId = ?', [userId]);
  await db.run('DELETE FROM messages WHERE senderId = ? OR receiverId = ?', [userId, userId]);
  await db.run('DELETE FROM notifications WHERE userId = ? OR senderId = ?', [userId, userId]);
  await db.run('DELETE FROM posts WHERE userId = ?', [userId]);
  const res = await db.run('DELETE FROM users WHERE id = ?', [userId]);
  return res.changes > 0;
}

export async function createSupportRequest(userId, username, type, description) {
  const res = await db.run(
    'INSERT INTO support_requests (userId, username, type, description) VALUES (?, ?, ?, ?)',
    [userId, username, type, description]
  );
  return res.lastID;
}

export async function getSupportRequests() {
  return await db.all('SELECT * FROM support_requests ORDER BY createdAt DESC');
}


