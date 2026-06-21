import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

import { deleteFile, uploadDatabase } from './github-service.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;

async function getRepoContents(dirPath = '') {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;
  if (isMock) return [];

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${dirPath}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Open-Store-Backend'
      }
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[Reset DB] Failed to get contents for path '${dirPath}':`, err.message);
    return [];
  }
}

async function resetSystem() {
  console.log("=== INITIATING SYSTEM DATABASE AND STORAGE RESET ===\n");

  const dbPath = path.join(process.cwd(), 'database.sqlite');

  // 1. Delete files from remote GitHub storage (if configured)
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;
  if (!isMock) {
    console.log("1. Cleaning remote GitHub repository storage...");
    
    // Clean files in root directory
    const rootContents = await getRepoContents('');
    if (Array.isArray(rootContents)) {
      for (const item of rootContents) {
        if (item.type === 'file') {
          const name = item.name;
          if (name === 'database.sqlite' || name === 'chats.json' || name.endsWith('.enc')) {
            console.log(`Deleting remote file: ${name}`);
            try {
              await deleteFile(name);
            } catch (err) {
              console.warn(`Failed to delete remote file ${name}:`, err.message);
            }
          }
        }
      }
    }

    // Clean files in avatars/ directory
    const avatarContents = await getRepoContents('avatars');
    if (Array.isArray(avatarContents)) {
      for (const item of avatarContents) {
        if (item.type === 'file') {
          const name = item.name;
          console.log(`Deleting remote avatar file: avatars/${name}`);
          try {
            await deleteFile(`avatars/${name}`);
          } catch (err) {
            console.warn(`Failed to delete remote avatar ${name}:`, err.message);
          }
        }
      }
    }
  } else {
    console.log("1. GITHUB storage not configured. Skipping remote repository clean.");
  }

  // 2. Delete local files
  console.log("2. Cleaning local database and chats files...");
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log("Deleted local database.sqlite");
    } catch (e) {
      console.warn("Failed to delete local database.sqlite:", e.message);
    }
  }

  // 3. Clear local mock-github-storage folder
  const mockStoragePath = path.join(process.cwd(), 'mock-github-storage');
  if (fs.existsSync(mockStoragePath)) {
    console.log("3. Clearing mock github storage folder...");
    const clearFolder = (dir) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          clearFolder(fullPath);
          try {
            fs.rmdirSync(fullPath);
          } catch (e) {}
        } else {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {}
        }
      }
    };
    clearFolder(mockStoragePath);
    console.log("Mock storage folder cleared.");
  }

  // 4. Initialize clean database and test user
  await initFreshDb();
}

async function initFreshDb() {
  console.log("\n4. Initializing clean database tables...");
  
  // Re-import database.js initDb after cleaning up database file
  const { initDb, createUser } = await import('./database.js');
  await initDb();
  
  console.log("Creating test user 'hii' / 'hii' (email: hii@gmail.com, pre-verified)...");
  const testUser = await createUser('hii', 'hii', 'hii@gmail.com');
  
  // Mark user as verified
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  await db.run('UPDATE users SET is_verified = 1 WHERE id = ?', [testUser.id]);
  await db.close();

  console.log("Testing user 'hii' created successfully.");
  
  // Upload database to GitHub
  console.log("Uploading newly initialized database backup to GitHub...");
  await uploadDatabase();
  
  console.log("\n=== SYSTEM RESET COMPLETED SUCCESSFULLY ===");
}

resetSystem().catch(err => {
  console.error("Reset Failed:", err);
});

