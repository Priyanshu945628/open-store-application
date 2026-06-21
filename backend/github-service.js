import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const MOCK_STORAGE_DIR = path.join(process.cwd(), 'mock-github-storage');

const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;

// Ensure mock storage directory exists (only if running locally and in mock mode)
if (isMock && !process.env.VERCEL) {
  if (!fs.existsSync(MOCK_STORAGE_DIR)) {
    fs.mkdirSync(MOCK_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Uploads an encrypted file (buffer) to GitHub or falls back to mock storage.
 */
export async function uploadFile(filename, buffer) {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;

  if (isMock) {
    const dest = path.join(MOCK_STORAGE_DIR, filename);
    await fs.promises.writeFile(dest, buffer);
    console.log(`[Storage Service] Mock-uploaded ${filename} (${buffer.length} bytes) to local mock storage.`);
    return {
      success: true,
      url: `/api/files/download/${filename}`,
      storage: 'mock'
    };
  }

  // GitHub Upload API requires base64 encoding for the payload transfer
  const contentBase64 = buffer.toString('base64');
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;

  console.log(`[Storage Service] Uploading ${filename} to GitHub repository ${GITHUB_OWNER}/${GITHUB_REPO}...`);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Open-Store-Backend'
    },
    body: JSON.stringify({
      message: `Upload encrypted file: ${filename}`,
      content: contentBase64
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub Upload Failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  console.log(`[Storage Service] Uploaded successfully. Commit SHA: ${data.commit.sha}`);

  return {
    success: true,
    url: `/api/files/download/${filename}`,
    storage: 'github',
    sha: data.content.sha
  };
}

/**
 * Downloads a specific byte range of a file from GitHub or local mock storage.
 */
export async function downloadChunk(filename, startByte, endByte) {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;

  if (isMock) {
    const src = path.join(MOCK_STORAGE_DIR, filename);
    if (!fs.existsSync(src)) {
      throw new Error(`File not found: ${filename}`);
    }

    const fileHandle = await fs.promises.open(src, 'r');
    const length = endByte - startByte + 1;
    const buffer = Buffer.alloc(length);
    
    // Read the specific byte range
    const { bytesRead } = await fileHandle.read(buffer, 0, length, startByte);
    await fileHandle.close();

    return buffer.subarray(0, bytesRead);
  }

  // GitHub Raw Content URL supports byte-range requests
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/${filename}`;
  console.log(`[Storage Service] Fetching range ${startByte}-${endByte} of ${filename} from GitHub...`);

  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Range': `bytes=${startByte}-${endByte}`,
      'User-Agent': 'Open-Store-Backend'
    }
  });

  if (!response.ok && response.status !== 206) {
    const errText = await response.text();
    throw new Error(`GitHub Chunk Fetch Failed: ${response.status} - ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Gets the total size of a file in storage.
 */
export async function getFileSize(filename) {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;

  if (isMock) {
    const src = path.join(MOCK_STORAGE_DIR, filename);
    if (!fs.existsSync(src)) {
      throw new Error(`File not found: ${filename}`);
    }
    const stats = await fs.promises.stat(src);
    return stats.size;
  }

  // For GitHub, we query the content API to get metadata (including size)
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Open-Store-Backend'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub metadata fetch failed for ${filename}: ${response.status}`);
  }

  const data = await response.json();
  return data.size;
}

/**
 * Deletes a file from GitHub or local storage.
 */
export async function deleteFile(filename) {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;

  if (isMock) {
    const src = path.join(MOCK_STORAGE_DIR, filename);
    if (fs.existsSync(src)) {
      await fs.promises.unlink(src);
      console.log(`[Storage Service] Deleted local mock file: ${filename}`);
    }
    return { success: true };
  }

  try {
    // 1. Get file SHA first
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Open-Store-Backend'
      }
    });

    if (!response.ok) {
      if (response.status === 404) return { success: true }; // File already doesn't exist
      throw new Error(`Failed to fetch file metadata for deletion: ${response.status}`);
    }

    const data = await response.json();
    const sha = data.sha;

    // 2. Delete file
    const delRes = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Open-Store-Backend'
      },
      body: JSON.stringify({
        message: `Delete file: ${filename}`,
        sha
      })
    });

    if (!delRes.ok) {
      throw new Error(`Failed to delete file from GitHub: ${delRes.status}`);
    }

    console.log(`[Storage Service] Deleted file from GitHub: ${filename}`);
    return { success: true };
  } catch (err) {
    console.error(`[Storage Service] Delete error for ${filename}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches the chats array from chats.json in GitHub or local storage.
 */
export async function getChats() {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;
  const filename = 'chats.json';

  if (isMock) {
    const src = path.join(MOCK_STORAGE_DIR, filename);
    if (!fs.existsSync(src)) return [];
    try {
      const content = await fs.promises.readFile(src, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return [];
    }
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw', // raw content directly
        'User-Agent': 'Open-Store-Backend'
      }
    });

    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`GitHub chats fetch failed: ${response.status}`);

    const text = await response.text();
    return JSON.parse(text || '[]');
  } catch (err) {
    console.error('[Storage Service] Failed to fetch chats:', err.message);
    return [];
  }
}

/**
 * Saves the chats array to chats.json in GitHub or local storage.
 */
export async function saveChats(chatsList) {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;
  const filename = 'chats.json';
  const contentStr = JSON.stringify(chatsList, null, 2);

  if (isMock) {
    const dest = path.join(MOCK_STORAGE_DIR, filename);
    await fs.promises.writeFile(dest, contentStr, 'utf-8');
    return { success: true };
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
    
    // 1. Get SHA if file already exists
    let sha = null;
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Open-Store-Backend'
      }
    });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // 2. Put new file content
    const contentB64 = Buffer.from(contentStr).toString('base64');
    let response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Open-Store-Backend'
      },
      body: JSON.stringify({
        message: 'Update chats history',
        content: contentB64,
        sha: sha || undefined
      })
    });

    if (!response.ok && (response.status === 409 || response.status === 422)) {
      console.warn(`[Storage Service] Conflict on save chats (${response.status}). Retrying with fresh SHA...`);
      const freshRes = await fetch(`${url}?t=${Date.now()}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Open-Store-Backend',
          'Cache-Control': 'no-cache'
        }
      });
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        const freshSha = freshData.sha;
        response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Open-Store-Backend'
          },
          body: JSON.stringify({
            message: 'Update chats history (retry)',
            content: contentB64,
            sha: freshSha
          })
        });
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GitHub chats save failed: ${response.status} - ${errText}`);
    }

    console.log('[Storage Service] Saved chats to GitHub chats.json successfully.');
    return { success: true };
  } catch (err) {
    console.error('[Storage Service] Failed to save chats:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Downloads database.sqlite from GitHub and saves it locally.
 */
export async function downloadDatabase() {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;
  const filename = 'database.sqlite';
  const localPath = process.env.VERCEL 
    ? path.join('/tmp', filename)
    : path.join(process.cwd(), filename);

  if (isMock) {
    console.log('[Storage Service] Running in mock storage mode. Skipping DB download from GitHub.');
    return false;
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'Open-Store-Backend'
      }
    });

    if (response.status === 404) {
      console.log('[Storage Service] No database.sqlite found on GitHub. Starting with fresh DB.');
      return false;
    }
    if (!response.ok) throw new Error(`GitHub DB fetch failed: ${response.status}`);

    const buffer = await response.arrayBuffer();
    await fs.promises.writeFile(localPath, Buffer.from(buffer));
    console.log('[Storage Service] Successfully downloaded database.sqlite from GitHub.');
    return true;
  } catch (err) {
    console.error('[Storage Service] Failed to download database.sqlite from GitHub:', err.message);
    return false;
  }
}

/**
 * Uploads database.sqlite to GitHub.
 */
export async function uploadDatabase() {
  const isMock = !GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO;
  const filename = 'database.sqlite';
  const localPath = process.env.VERCEL 
    ? path.join('/tmp', filename)
    : path.join(process.cwd(), filename);

  if (isMock) {
    return { success: true };
  }

  try {
    if (!fs.existsSync(localPath)) {
      console.warn('[Storage Service] database.sqlite does not exist locally to upload.');
      return { success: false, error: 'File not found' };
    }

    const content = await fs.promises.readFile(localPath);
    const contentB64 = content.toString('base64');
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;

    // 1. Get SHA if file already exists
    let sha = null;
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Open-Store-Backend'
      }
    });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    // 2. Put new file content
    let response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Open-Store-Backend'
      },
      body: JSON.stringify({
        message: 'Backup database.sqlite',
        content: contentB64,
        sha: sha || undefined
      })
    });

    if (!response.ok && (response.status === 409 || response.status === 422)) {
      console.warn(`[Storage Service] Conflict on upload database.sqlite (${response.status}). Retrying with fresh SHA...`);
      const freshRes = await fetch(`${url}?t=${Date.now()}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Open-Store-Backend',
          'Cache-Control': 'no-cache'
        }
      });
      if (freshRes.ok) {
        const freshData = await freshRes.json();
        const freshSha = freshData.sha;
        response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Open-Store-Backend'
          },
          body: JSON.stringify({
            message: 'Backup database.sqlite (retry)',
            content: contentB64,
            sha: freshSha
          })
        });
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GitHub DB upload failed: ${response.status} — ${errText}`);
    }

    console.log('[Storage Service] Successfully backed up database.sqlite to GitHub.');
    return { success: true };
  } catch (err) {
    console.error('[Storage Service] Failed to upload database.sqlite to GitHub:', err.message);
    return { success: false, error: err.message };
  }
}
