import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';
import path from 'path';
import { 
  initDb, createUser, loginUser, createPost, getAllPosts, 
  toggleLike, addComment, getCommentsForPost, getPostById,
  isUsernameTaken, updateUserSettings, toggleFollow, getFollowedUsers, getFollowers,
  acceptFollow, declineFollow, canChat, getChatContacts,
  getPostsByUserId, searchUsersAndVideos, addStory, getActiveStories, deleteExpiredStories,
  sendMessage, getDirectMessages, getUserById,
  incrementPostViews, getUserProfileStats, getNotifications, clearNotifications,
  getChannelComments, deleteComment,
  isIpBanned, banIp, unbanIp, getBannedIps, getAllUsers,
  getUserTotpSecret, updateUserTotp, updateUserOtp, verifyUserOtp,
  getUserByEmailOrUsername, resetUserPassword, revokeUserAccount,
  createSupportRequest, getSupportRequests
} from './database.js';
import { verifyTOTP, generateBase32Secret } from './totp.js';
import { sendOtpEmail, sendRevocationEmail } from './email-service.js';

// In-memory typing state: key = `${userId}_${targetId}`, value = timestamp
const typingStates = new Map();
import { uploadFile, downloadChunk, getFileSize, deleteFile, getChats, saveChats } from './github-service.js';
import { uploadToTelegram, downloadTelegramChunk } from './telegram-service.js';
import { encryptBuffer, decryptBlock, BLOCK_SIZE } from './custom-crypto.js';

let cachedChats = null;
async function getChatsList() {
  if (!cachedChats) {
    try {
      cachedChats = await getChats();
    } catch (e) {
      return [];
    }
  }
  return cachedChats || [];
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CRYPTO_KEY = process.env.CRYPTO_KEY || "open_store_dev_friend_super_secret_encryption_key_2026";

app.use(cors());
app.use(express.json());

// Sync SQLite database from GitHub if running on Vercel
let lastDbSyncTime = 0;
const DB_SYNC_THROTTLE_MS = 3000;

app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    const now = Date.now();
    if (now - lastDbSyncTime > DB_SYNC_THROTTLE_MS) {
      try {
        const { syncDatabase } = await import('./database.js');
        await syncDatabase();
        lastDbSyncTime = Date.now();
        console.log('[Sync Database] SQLite database synced successfully from GitHub.');
      } catch (err) {
        console.error('[Sync Database] Failed to sync database:', err.message);
      }
    }
  }
  next();
});

// Post-request database upload middleware for Vercel (uploads database once at the end of requests that wrote to database)
app.use((req, res, next) => {
  if (process.env.VERCEL) {
    const originalEnd = res.end;
    res.end = async function(...args) {
      try {
        const { isDbModified, clearDbModified } = await import('./database.js');
        if (isDbModified()) {
          clearDbModified();
          console.log('[Database Sync] Database modified. Uploading database.sqlite to GitHub...');
          const { uploadDatabase } = await import('./github-service.js');
          await uploadDatabase();
          console.log('[Database Sync] Database uploaded successfully.');
        }
      } catch (err) {
        console.error('[Database Sync] Failed to upload database on request end:', err.message);
      }
      originalEnd.apply(this, args);
    };
  }
  next();
});

app.use('/admin', express.static(path.join(process.cwd(), '../admin-panel')));

// Custom security headers middleware
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval';");
  next();
});

// Simple in-memory rate limiter: max 120 requests per minute per IP
const rateLimitMap = new Map();
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < 60000);
  if (timestamps.length >= 120) {
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  next();
});

// IP Ban Middleware
app.use(async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const banned = await isIpBanned(ip);
    if (banned) {
      return res.status(403).send("Forbidden: Your IP is revoked.");
    }
  } catch (err) {
    // Continue if DB error
  }
  next();
});

// Disable API caching to prevent browser stuck at old states
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Configure Multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Initialize DB
try {
  await initDb();
} catch (error) {
  console.error("Database initialization failed:", error);
}

// --- API ROUTES ---

const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'zoho.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
  'yandex.com',
  'mail.com',
  'mail.ru',
  'live.com',
  'msn.com'
]);

// 1. Authentication
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (email) {
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    const domain = email.trim().toLowerCase().split('@')[1];
    if (!TRUSTED_EMAIL_DOMAINS.has(domain)) {
      return res.status(400).json({ error: "Only trusted email providers (like Gmail, Yahoo, Outlook, Hotmail, etc.) are allowed." });
    }
  }
  try {
    const user = await createUser(username, password, email);
    res.json(user);
  } catch (error) {
    console.error('[Register Error]', error);
    if (error.message === 'Username already exists') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const user = await loginUser(username, password);
    if (user.totp_enabled) {
      return res.json({ require2FA: true, userId: user.id });
    }
    res.json(user);
  } catch (error) {
    console.error('[Login Error]', error);
    if (error.message === 'Invalid username or password') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: "User ID and token are required" });
  }
  try {
    const user = await verifyUserOtp(parseInt(userId), token);
    res.json(user);
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    if (error.message === 'Invalid OTP code' || error.message === 'OTP code has expired' || error.message === 'User not found') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: "Username or email is required" });
  }
  try {
    const user = await getUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    if (!user.email) {
      return res.status(400).json({ error: "User does not have an email address configured" });
    }
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000;
    await updateUserOtp(user.id, otpCode, otpExpires);
    await sendOtpEmail(user.email, otpCode);
    
    res.json({ success: true, requireResetOTP: true, userId: user.id });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { userId, token, newPassword } = req.body;
  if (!userId || !token || !newPassword) {
    return res.status(400).json({ error: "All fields (userId, token, newPassword) are required" });
  }
  try {
    const user = await getUserById(parseInt(userId));
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    const rawUser = await getUserByEmailOrUsername(user.username);
    if (!rawUser.otp_code || rawUser.otp_code !== token) {
      return res.status(400).json({ error: "Invalid verification code" });
    }
    if (Date.now() > rawUser.otp_expires) {
      return res.status(400).json({ error: "Verification code has expired" });
    }
    
    await resetUserPassword(user.id, newPassword);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ error: "Server Error" });
  }
});

// 2FA Setup
app.post('/api/auth/setup-2fa', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "User ID is required" });
  try {
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const secret = generateBase32Secret();
    const otpauthUrl = `otpauth://totp/OpenStore:${user.username}?secret=${secret}&issuer=OpenStore`;
    res.json({ secret, otpauthUrl });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Enable 2FA
app.post('/api/auth/enable-2fa', async (req, res) => {
  const { userId, token, secret } = req.body;
  if (!userId || !token || !secret) {
    return res.status(400).json({ error: "User ID, secret, and token are required" });
  }
  try {
    const verified = verifyTOTP(secret, token);
    if (!verified) {
      return res.status(400).json({ error: "Invalid 2FA code. Please check your authenticator app." });
    }

    const updatedUser = await updateUserTotp(userId, secret, true);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Verify 2FA (during Login)
app.post('/api/auth/verify-2fa', async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: "User ID and token are required" });
  }
  try {
    const secret = await getUserTotpSecret(userId);
    if (!secret) {
      return res.status(400).json({ error: "2FA is not set up for this user." });
    }

    const verified = verifyTOTP(secret, token);
    if (!verified) {
      return res.status(400).json({ error: "Invalid 2FA code" });
    }

    const user = await getUserById(userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Disable 2FA
app.post('/api/auth/disable-2fa', async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: "User ID and token are required" });
  }
  try {
    const secret = await getUserTotpSecret(userId);
    if (!secret) {
      return res.status(400).json({ error: "2FA is not enabled." });
    }

    const verified = verifyTOTP(secret, token);
    if (!verified) {
      return res.status(400).json({ error: "Invalid 2FA code" });
    }

    const updatedUser = await updateUserTotp(userId, null, false);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 2. Settings & Profile Updates (with Username check and suggestions)
app.post('/api/users/:id/update', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { 
    username, name = '', avatar, niche,
    description = '', tag = '', socialUrl = '',
    defaultPlaybackQuality = 'Auto', mediaCompression = 'Balanced',
    autoplayCaptions = 1
  } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Validate tag (max 10 chars) and description (max 50 chars)
  if (tag && tag.length > 10) {
    return res.status(400).json({ error: "Tag must be 10 characters or fewer" });
  }
  if (description && description.length > 50) {
    return res.status(400).json({ error: "Description must be 50 characters or fewer" });
  }

  try {
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check username uniqueness if they are changing it
    if (username !== currentUser.username) {
      const taken = await isUsernameTaken(username);
      if (taken) {
        // Generate 3 unique username suggestions
        const suggestions = [];
        let index = 1;
        while (suggestions.length < 3) {
          const suffix = index === 1 ? 'test1' : index === 2 ? 'dev' : Math.floor(Math.random() * 90) + 10;
          const candidate = `${username}_${suffix}`;
          const isTaken = await isUsernameTaken(candidate);
          if (!isTaken && !suggestions.includes(candidate)) {
            suggestions.push(candidate);
          }
          index++;
        }
        return res.status(409).json({ 
          error: "Username is already taken.", 
          suggestions 
        });
      }
    }

    const updatedUser = await updateUserSettings(userId, { 
      username, name, avatar, niche,
      description, tag, socialUrl,
      defaultPlaybackQuality, mediaCompression, autoplayCaptions
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Typing Indicator API (in-memory, no WebSocket needed)
app.post('/api/chat/typing', (req, res) => {
  const { userId, targetUserId } = req.body;
  if (!userId || !targetUserId) return res.status(400).json({ error: 'userId and targetUserId required' });
  const key = `${userId}_${targetUserId}`;
  typingStates.set(key, Date.now());
  res.json({ ok: true });
});

app.get('/api/chat/typing', (req, res) => {
  const { userId, targetUserId } = req.query;
  if (!userId || !targetUserId) return res.status(400).json({ error: 'userId and targetUserId required' });
  // Check if target is typing to current user
  const key = `${targetUserId}_${userId}`;
  const ts = typingStates.get(key);
  const isTyping = ts && (Date.now() - ts) < 3000;
  // Clean up stale entries occasionally
  if (ts && !isTyping) typingStates.delete(key);
  res.json({ isTyping: !!isTyping });
});

// Channel Comments Moderation
app.get('/api/users/:id/channel-comments', async (req, res) => {
  const creatorId = parseInt(req.params.id);
  try {
    const comments = await getChannelComments(creatorId);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.delete('/api/comments/:id', async (req, res) => {
  const commentId = parseInt(req.params.id);
  const requestingUserId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
  if (!requestingUserId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const result = await deleteComment(commentId, requestingUserId);
    res.json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

// 2b. Profile Picture Upload — stores raw image to GitHub or local, returns public proxy URL
app.post('/api/users/:id/avatar', upload.single('avatar'), async (req, res) => {
  const userId = parseInt(req.params.id);

  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  try {
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Garbage collect previous avatar if it was a custom upload
    const oldAvatar = currentUser.avatar;
    if (oldAvatar && oldAvatar.includes('/api/avatar/avatars/')) {
      const parts = oldAvatar.split('/api/avatar/avatars/');
      const oldFilename = parts[parts.length - 1];
      if (oldFilename) {
        console.log(`[Avatar GC] Deleting previous avatar: avatars/${oldFilename}`);
        try {
          await deleteFile(`avatars/${oldFilename}`);
        } catch (e) {
          console.error(`[Avatar GC Error] Failed to delete previous avatar avatars/${oldFilename}:`, e.message);
        }
      }
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ error: "Only image files are allowed (jpg, png, gif, webp)" });
    }

    const filename = `avatar_${userId}_${Date.now()}.${ext}`;
    const buffer   = req.file.buffer;

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER;
    const GITHUB_REPO  = process.env.GITHUB_REPO;
    const useGitHub    = !!(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);

    if (useGitHub) {
      // Upload raw (unencrypted) to GitHub — avatars are public profile images
      const contentB64 = buffer.toString('base64');
      const ghUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/avatars/${filename}`;

      console.log(`[Avatar] Uploading avatar for user ${userId} to GitHub...`);
      const ghRes = await fetch(ghUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Open-Store-Backend'
        },
        body: JSON.stringify({
          message: `Avatar upload for user ${userId}`,
          content: contentB64
        })
      });

      if (!ghRes.ok) {
        const errText = await ghRes.text();
        throw new Error(`GitHub avatar upload failed: ${ghRes.status} — ${errText}`);
      }
    } else {
      // Local mock storage — serve via static file route
      const { promises: fsp } = await import('fs');
      const { join } = await import('path');
      const localDir  = join(process.cwd(), 'mock-github-storage', 'avatars');
      await fsp.mkdir(localDir, { recursive: true });
      await fsp.writeFile(join(localDir, filename), buffer);
    }

    // Construct the proxy URL served by our backend
    const avatarUrl = `${req.protocol}://${req.get('host')}/api/avatar/avatars/${filename}`;
    console.log(`[Avatar] Configured proxy URL: ${avatarUrl}`);

    // Save the avatar URL to the user's profile in the database
    const { niche, username } = currentUser;
    const updatedUser = await updateUserSettings(userId, { username, avatar: avatarUrl, niche });

    res.json({ avatarUrl, user: updatedUser });
  } catch (error) {
    console.error('[Avatar Upload Error]', error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Serve avatar files through the proxy (supporting private GitHub repo download or local fallback)
app.get('/api/avatar/avatars/:filename', async (req, res) => {
  const { filename } = req.params;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO  = process.env.GITHUB_REPO;
  const useGitHub    = !!(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);

  try {
    let mimeType = 'image/jpeg';
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';

    res.setHeader('Content-Type', mimeType);

    if (useGitHub) {
      const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/avatars/${filename}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'Open-Store-Backend'
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to download avatar from GitHub" });
      }
      const arrayBuffer = await response.arrayBuffer();
      return res.end(Buffer.from(arrayBuffer));
    } else {
      const { createReadStream, existsSync } = await import('fs');
      const { join } = await import('path');
      const filepath = join(process.cwd(), 'mock-github-storage', 'avatars', filename);
      if (!existsSync(filepath)) return res.status(404).json({ error: "Avatar not found" });
      createReadStream(filepath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});



// 3. User profiles (filter only that user's posts)
app.get('/api/users/:id/posts', async (req, res) => {
  const userId = parseInt(req.params.id);
  const currentUserId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
  try {
    const posts = await getPostsByUserId(userId, currentUserId);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await getUserById(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 4. Follows API
app.post('/api/users/:id/follow', async (req, res) => {
  const followedId = parseInt(req.params.id);
  const { followerId } = req.body;
  
  if (!followerId) {
    return res.status(400).json({ error: "Follower ID is required" });
  }

  try {
    const result = await toggleFollow(parseInt(followerId), followedId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get('/api/users/:id/following', async (req, res) => {
  try {
    const following = await getChatContacts(parseInt(req.params.id));
    res.json(following);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get('/api/users/:id/followers', async (req, res) => {
  try {
    const followers = await getFollowers(parseInt(req.params.id));
    res.json(followers);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/follows/accept', async (req, res) => {
  const { followerId, followedId } = req.body;
  if (!followerId || !followedId) {
    return res.status(400).json({ error: "followerId and followedId are required" });
  }
  try {
    await acceptFollow(parseInt(followerId), parseInt(followedId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/follows/decline', async (req, res) => {
  const { followerId, followedId } = req.body;
  if (!followerId || !followedId) {
    return res.status(400).json({ error: "followerId and followedId are required" });
  }
  try {
    await declineFollow(parseInt(followerId), parseInt(followedId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 5. Social Feed
app.get('/api/posts', async (req, res) => {
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
  try {
    const posts = await getAllPosts(userId);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/posts', upload.single('media'), async (req, res) => {
  const { userId, type, content, githubRepo, niche, tags, collaboratorId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const user = await getUserById(parseInt(userId));
    if (!user) {
      return res.status(401).json({ error: "Invalid user session. Please log in again." });
    }

    let mediaUrl = null;
    let mediaName = null;
    let mediaType = null;

    if (req.file) {
      mediaName = req.file.originalname;
      mediaType = req.file.mimetype;
      
      console.log(`[Server] Encrypting file: ${mediaName} (${req.file.size} bytes) using custom DCBS...`);
      const encryptedBuffer = encryptBuffer(req.file.buffer, CRYPTO_KEY);
      
      const ext = mediaName.split('.').pop();
      const uniqueFilename = `file_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}.enc`;

      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = process.env.TELEGRAM_CHAT_ID;
      const useTelegram = !!(tgToken && tgChatId);

      if (useTelegram) {
        try {
          console.log(`[Telegram Storage] Attempting to upload encrypted ${mediaName} to Telegram Bot...`);
          const tgRes = await uploadToTelegram(uniqueFilename, encryptedBuffer);
          mediaUrl = `tg:${tgRes.fileId}`;
        } catch (tgErr) {
          console.warn(`[Telegram Storage Error] Telegram upload failed, falling back to GitHub/Mock:`, tgErr.message);
          await uploadFile(uniqueFilename, encryptedBuffer);
          mediaUrl = uniqueFilename;
        }
      } else {
        await uploadFile(uniqueFilename, encryptedBuffer);
        mediaUrl = uniqueFilename;
      }
    }

    const post = await createPost({
      userId: parseInt(userId),
      type,
      content,
      mediaUrl,
      mediaName,
      mediaType,
      githubRepo,
      niche,
      tags,
      collaboratorId: collaboratorId ? parseInt(collaboratorId) : null
    });

    res.json(post);
  } catch (error) {
    console.error("Upload/Post Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Likes
app.post('/api/posts/:id/like', async (req, res) => {
  const postId = parseInt(req.params.id);
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }
  try {
    const result = await toggleLike(postId, parseInt(userId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Comments & Nested replies
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const comments = await getCommentsForPost(parseInt(req.params.id));
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  const postId = parseInt(req.params.id);
  const { userId, content, parentId } = req.body;
  if (!userId || !content) {
    return res.status(400).json({ error: "User ID and content required" });
  }
  try {
    const comment = await addComment(postId, parseInt(userId), content, parentId ? parseInt(parentId) : null);
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 6. Fuzzy Search API (Members & Video uploads)
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  const currentUserId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
  if (q === undefined || q === null) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }
  try {
    const results = await searchUsersAndVideos(q, currentUserId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 7. Direct Messages (DMs) API
app.get('/api/messages', async (req, res) => {
  const { userA, userB } = req.query;
  if (!userA || !userB) {
    return res.status(400).json({ error: "Parameters userA and userB are required" });
  }
  try {
    const uA = parseInt(userA);
    const uB = parseInt(userB);
    const messages = await getDirectMessages(uA, uB);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages from SQLite:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/messages', upload.single('media'), async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  
  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "Sender and receiver IDs are required" });
  }

  try {
    const sId = parseInt(senderId);
    const rId = parseInt(receiverId);
    const sender = await getUserById(sId);
    if (!sender) {
      return res.status(401).json({ error: "Invalid sender session. Please log in again." });
    }

    const allowed = await canChat(sId, rId);
    if (!allowed) {
      return res.status(403).json({ error: "Chat is locked until follow request is accepted." });
    }

    let mediaUrl = null;
    if (req.file) {
      // Encrypt file and upload
      const encryptedBuffer = encryptBuffer(req.file.buffer, CRYPTO_KEY);
      const ext = req.file.originalname.split('.').pop();
      const uniqueFilename = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}.enc`;
      
      const tgToken = process.env.TELEGRAM_BOT_TOKEN;
      const tgChatId = process.env.TELEGRAM_CHAT_ID;
      if (tgToken && tgChatId) {
        try {
          const tgRes = await uploadToTelegram(uniqueFilename, encryptedBuffer);
          mediaUrl = `tg:${tgRes.fileId}`;
        } catch (err) {
          await uploadFile(uniqueFilename, encryptedBuffer);
          mediaUrl = uniqueFilename;
        }
      } else {
        await uploadFile(uniqueFilename, encryptedBuffer);
        mediaUrl = uniqueFilename;
      }
    }

    const newMsg = await sendMessage(
      sId,
      rId,
      content || null,
      mediaUrl,
      req.file ? req.file.originalname : null
    );

    // Create message notification for recipient
    const { createNotification } = await import('./database.js');
    await createNotification(rId, sId, 'message', `@${sender.username} sent you a message`);

    res.json(newMsg);
  } catch (error) {
    console.error("Error sending message to SQLite:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// 8. Stories API
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await getActiveStories();
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/stories', upload.single('media'), async (req, res) => {
  const { userId, type, content } = req.body; // type is 'text' or 'image'
  if (!userId || !type) {
    return res.status(400).json({ error: "User ID and type are required" });
  }
  try {
    const user = await getUserById(parseInt(userId));
    if (!user) {
      return res.status(401).json({ error: "Invalid user session. Please log in again." });
    }

    let mediaUrl = null;
    if (req.file) {
      // Encrypt story media and upload
      const encryptedBuffer = encryptBuffer(req.file.buffer, CRYPTO_KEY);
      const ext = req.file.originalname.split('.').pop();
      const uniqueFilename = `story_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}.enc`;
      await uploadFile(uniqueFilename, encryptedBuffer);
      mediaUrl = uniqueFilename;
    }
    const story = await addStory(parseInt(userId), type, mediaUrl, content);
    res.json(story);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 9. GitHub Repository README Scraper API
app.get('/api/github/readme', async (req, res) => {
  const { repo } = req.query; // format: 'owner/repo'
  if (!repo) {
    return res.status(400).json({ error: "Repo parameter is required" });
  }

  try {
    // Try fetching README from main branch, then master branch
    const headers = {
      'User-Agent': 'Open-Store-Backend'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    let rawMarkdown = '';
    
    // Attempt 1: main branch
    let readmeRes = await fetch(`https://raw.githubusercontent.com/${repo}/main/README.md`, { headers });
    if (readmeRes.ok) {
      rawMarkdown = await readmeRes.text();
    } else {
      // Attempt 2: master branch
      readmeRes = await fetch(`https://raw.githubusercontent.com/${repo}/master/README.md`, { headers });
      if (readmeRes.ok) {
        rawMarkdown = await readmeRes.text();
      } else {
        return res.status(404).json({ error: "README.md not found in main or master branches." });
      }
    }

    res.json({ markdown: rawMarkdown });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 10. GitHub Repo Proxy
app.get('/api/github/repo', async (req, res) => {
  const { repo } = req.query;
  if (!repo) {
    return res.status(400).json({ error: "Repo query parameter is required" });
  }

  try {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Open-Store-Backend'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: `GitHub API error: ${response.statusText}` });
    }

    const data = await response.json();
    
    const langRes = await fetch(`https://api.github.com/repos/${repo}/languages`, { headers });
    const languages = langRes.ok ? await langRes.json() : {};

    res.json({
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
      languages: Object.keys(languages).slice(0, 3),
      url: data.html_url
    });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 10.5 Project Web Preview Scraper API
app.get('/api/project/preview', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL query parameter is required" });
  
  try {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    console.log(`[Preview Scraper] Fetching meta details for: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    
    const html = await response.text();
    
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    
    let description = 'Live website preview';
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
                      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
    if (descMatch) {
      description = descMatch[1].trim();
    }
    
    let image = '';
    const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) ||
                     html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i) ||
                     html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']*)["']/i) ||
                     html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:image["']/i);
    if (imgMatch) {
      image = imgMatch[1].trim();
      if (image && !image.startsWith('http')) {
        const parsedUrl = new URL(targetUrl);
        image = new URL(image, parsedUrl.origin).toString();
      }
    }

    res.json({ title, description, image, url: targetUrl });
  } catch (error) {
    console.warn(`[Preview Scraper Failed] ${error.message}`);
    res.json({ 
      title: url, 
      description: 'Live interactive website preview. Click button below to view live page.', 
      image: '', 
      url: url.startsWith('http') ? url : `https://${url}` 
    });
  }
});

// 11. Streaming & Decryption Endpoint
app.get('/api/files/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const rangeHeader = req.headers.range;

  try {
    const isTelegram = filename.startsWith('tg:');
    const fileId = isTelegram ? filename.substring(3) : null;

    let fileSize;
    let telegramPath = '';
    if (isTelegram) {
      const tempRes = await downloadTelegramChunk(fileId, 0, 1);
      fileSize = tempRes.fileSize;
      telegramPath = tempRes.filePath || '';
    } else {
      fileSize = await getFileSize(filename);
    }
    
    let mimeType = 'application/octet-stream';
    try {
      const nameForExt = isTelegram ? telegramPath : filename;
      const ext = nameForExt.split('.').reverse()[1];
      if (ext === 'mp4' || ext === 'webm') mimeType = `video/${ext}`;
      else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    } catch (e) {
      // ignore
    }

    if (!rangeHeader) {
      console.log(`[Streaming] Full download requested for ${filename}`);
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes'
      });

      const totalBlocks = Math.ceil(fileSize / BLOCK_SIZE);
      if (isTelegram) {
        const resObj = await downloadTelegramChunk(fileId);
        const encryptedFull = resObj.buffer;
        for (let b = 0; b < totalBlocks; b++) {
          const start = b * BLOCK_SIZE;
          const end = Math.min(start + BLOCK_SIZE, fileSize);
          const block = encryptedFull.subarray(start, end);
          const decryptedBlock = decryptBlock(block, CRYPTO_KEY, b);
          res.write(decryptedBlock);
        }
      } else {
        for (let b = 0; b < totalBlocks; b++) {
          const start = b * BLOCK_SIZE;
          const end = Math.min(start + BLOCK_SIZE, fileSize);
          const block = await downloadChunk(filename, start, end - 1);
          const decryptedBlock = decryptBlock(block, CRYPTO_KEY, b);
          res.write(decryptedBlock);
        }
      }
      return res.end();
    }

    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    
    // Limit chunks to 5 * BLOCK_SIZE (320KB) to ensure rapid loading of video segments
    const MAX_CHUNK_SIZE = 5 * BLOCK_SIZE; 
    let end = parts[1] ? parseInt(parts[1], 10) : (start + MAX_CHUNK_SIZE - 1);
    if (end - start + 1 > MAX_CHUNK_SIZE) {
      end = start + MAX_CHUNK_SIZE - 1;
    }
    if (end >= fileSize) {
      end = fileSize - 1;
    }

    if (start >= fileSize || end >= fileSize || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${fileSize}`
      });
      return res.end();
    }

    const startBlock = Math.floor(start / BLOCK_SIZE);
    const endBlock = Math.floor(end / BLOCK_SIZE);

    const encStartByte = startBlock * BLOCK_SIZE;
    const encEndByte = Math.min((endBlock + 1) * BLOCK_SIZE - 1, fileSize - 1);

    let encryptedSegment;
    if (isTelegram) {
      const resObj = await downloadTelegramChunk(fileId, encStartByte, encEndByte);
      encryptedSegment = resObj.buffer;
    } else {
      encryptedSegment = await downloadChunk(filename, encStartByte, encEndByte);
    }

    const decryptedBlocks = [];
    const blockCount = endBlock - startBlock + 1;

    for (let i = 0; i < blockCount; i++) {
      const currentBlockIndex = startBlock + i;
      const blockStart = i * BLOCK_SIZE;
      const blockEnd = Math.min(blockStart + BLOCK_SIZE, encryptedSegment.length);
      const encBlock = encryptedSegment.subarray(blockStart, blockEnd);

      const decBlock = decryptBlock(encBlock, CRYPTO_KEY, currentBlockIndex);
      decryptedBlocks.push(decBlock);
    }

    const decryptedSegment = Buffer.concat(decryptedBlocks);

    const relativeStart = start - encStartByte;
    const relativeEnd = relativeStart + (end - start + 1);
    const finalBuffer = decryptedSegment.subarray(relativeStart, relativeEnd);

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': finalBuffer.length,
      'Content-Type': mimeType
    });
    res.end(finalBuffer);

  } catch (error) {
    console.error("Streaming Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Views and Stats APIs
app.post('/api/posts/:id/view', async (req, res) => {
  const postId = parseInt(req.params.id);
  try {
    await incrementPostViews(postId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get('/api/users/:id/stats', async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const stats = await getUserProfileStats(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Notifications APIs
app.get('/api/notifications', async (req, res) => {
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  try {
    const list = await getNotifications(userId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/notifications/clear', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  try {
    await clearNotifications(parseInt(userId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

// Admin Portal Integration
const adminFailedAttempts = new Map();
const adminActiveSessions = new Set();

app.post('/api/admin/login', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // 1. IP Ban check
  const isBanned = await isIpBanned(ip);
  if (isBanned) {
    return res.status(403).json({ error: "Access Denied: IP Banned due to security threshold violation." });
  }

  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@openstore.dev";
  const adminPassword = process.env.ADMIN_PASSWORD || "SuperSecureAdminPassword2026!";

  if (email !== adminEmail || password !== adminPassword) {
    // Increment failed attempts
    const attempts = (adminFailedAttempts.get(ip) || 0) + 1;
    adminFailedAttempts.set(ip, attempts);
    
    if (attempts >= 3) {
      await banIp(ip);
      console.log(`[Security Alert] IP ${ip} banned permanently after 3 failed admin login attempts.`);
      return res.status(403).json({ error: "Access Denied: Threshold violated. IP banned." });
    }

    return res.status(401).json({ error: `Invalid Credentials. ${3 - attempts} attempts remaining.` });
  }

  // Success: reset attempts
  adminFailedAttempts.delete(ip);

  // Generate secure session token and cryptographically encrypt validation block
  // This prevents MITM status: true modifications as the client must decrypt the block with the password key
  const sessionToken = crypto.randomBytes(32).toString('hex');
  adminActiveSessions.add(sessionToken);

  const payloadObj = {
    status: "success",
    token: sessionToken,
    timestamp: Date.now(),
    role: "administrator"
  };

  const payloadBuffer = Buffer.from(JSON.stringify(payloadObj), 'utf-8');
  // Encrypt payload using the admin password itself
  const encryptedPayload = encryptBuffer(payloadBuffer, adminPassword);

  res.json({
    securePayload: encryptedPayload.toString('hex')
  });
});

// Admin auth check helper
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !adminActiveSessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized access: admin session required." });
  }
  next();
}

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const list = await getAllUsers();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get('/api/admin/banned-ips', requireAdmin, async (req, res) => {
  try {
    const list = await getBannedIps();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/admin/unban', requireAdmin, async (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: "IP address is required" });
  }
  try {
    await unbanIp(ip);
    adminFailedAttempts.delete(ip);
    console.log(`[Security Action] IP ${ip} unbanned by administrator.`);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/support-requests', async (req, res) => {
  const { type, description } = req.body;
  if (!type || !description) {
    return res.status(400).json({ error: "Type and description are required" });
  }
  if (type !== 'error' && type !== 'feature') {
    return res.status(400).json({ error: "Type must be either 'error' or 'feature'" });
  }

  const userIdStr = req.headers['x-user-id'];
  let userId = null;
  let username = 'Anonymous';

  if (userIdStr) {
    userId = parseInt(userIdStr);
    try {
      const user = await getUserById(userId);
      if (user) {
        username = user.username;
      }
    } catch (e) {
      // Ignored
    }
  }

  try {
    const requestId = await createSupportRequest(userId, username, type, description);
    res.json({ success: true, requestId });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.get('/api/admin/support-requests', requireAdmin, async (req, res) => {
  try {
    const list = await getSupportRequests();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

app.post('/api/admin/users/:id/revoke', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { reason } = req.body;
  
  try {
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const success = await revokeUserAccount(userId);
    if (!success) {
      return res.status(500).json({ error: "Failed to revoke user from database" });
    }
    
    if (user.email) {
      sendRevocationEmail(user.email, reason || 'Violation of content policy.').catch(err => {
        console.log(`[Revocation Email Warning] Failed to send email to ${user.email}: ${err.message}`);
      });
    }

    console.log(`[Security Action] User @${user.username} revoked by admin. Reason: ${reason}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`[Admin Revoke Error]`, error);
    res.status(500).json({ error: "Server Error" });
  }
});


// Stories 24h Expiry and Media Deletion Cleanup
async function performStoryCleanup() {
  console.log('[Stories Cleanup] Running 24-hour story expiration checks...');
  try {
    const expired = await deleteExpiredStories();
    for (const story of expired) {
      if (story.mediaUrl) {
        console.log(`[Stories Cleanup] Deleting expired story media file: ${story.mediaUrl}`);
        try {
          await deleteFile(story.mediaUrl);
        } catch (err) {
          console.error(`[Stories Cleanup] Failed to delete file ${story.mediaUrl} from storage:`, err.message);
        }
      }
    }
    if (expired.length > 0) {
      console.log(`[Stories Cleanup] Successfully cleaned up ${expired.length} expired stories.`);
    }
  } catch (err) {
    console.error('[Stories Cleanup] Error during periodic checks:', err);
  }
}

// Run immediately on server start, and then every 30 minutes
performStoryCleanup();
setInterval(performStoryCleanup, 30 * 60 * 1000);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] Open Store backend listening on http://localhost:${PORT}`);
  });
}

export default app;

