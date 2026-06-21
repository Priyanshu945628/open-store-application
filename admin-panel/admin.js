// Matrix Digital Rain Background
const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const katakana = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$#@&%+-*/';
const alphabet = katakana.split('');

const fontSize = 14;
const columns = canvas.width / fontSize;

const rainDrops = [];

for (let x = 0; x < columns; x++) {
  rainDrops[x] = 1;
}

const draw = () => {
  ctx.fillStyle = 'rgba(5, 8, 12, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#00ff66';
  ctx.font = fontSize + 'px monospace';

  for (let i = 0; i < rainDrops.length; i++) {
    const text = alphabet[Math.floor(Math.random() * alphabet.length)];
    ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

    if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      rainDrops[i] = 0;
    }
    rainDrops[i]++;
  }
};

setInterval(draw, 30);

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// --- Dynamic Chaotic Bit-Scrambler Decryption routines ---
const BLOCK_SIZE = 64 * 1024;

function writeUInt32BE(array, value, offset) {
  array[offset] = (value >>> 24) & 0xff;
  array[offset + 1] = (value >>> 16) & 0xff;
  array[offset + 2] = (value >>> 8) & 0xff;
  array[offset + 3] = value & 0xff;
}

function readUInt32BE(array, offset) {
  return ((array[offset] << 24) |
          (array[offset + 1] << 16) |
          (array[offset + 2] << 8) |
          array[offset + 3]) >>> 0;
}

function customHash256(input) {
  let buffer;
  if (typeof input === 'string') {
    buffer = new TextEncoder().encode(input);
  } else {
    buffer = input;
  }

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const originalLength = buffer.length;
  const bitLength = originalLength * 8;
  const paddedLength = Math.ceil((originalLength + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(buffer);
  padded[originalLength] = 0x80;

  const highBitLength = Math.floor(bitLength / 0x100000000);
  const lowBitLength = bitLength % 0x100000000;
  writeUInt32BE(padded, highBitLength, paddedLength - 8);
  writeUInt32BE(padded, lowBitLength, paddedLength - 4);

  for (let i = 0; i < padded.length; i += 64) {
    const w = new Uint32Array(16);
    for (let t = 0; t < 16; t++) {
      w[t] = readUInt32BE(padded, i + t * 4);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 32; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + w[t % 16] + 0x428a2f98) | 0;
      
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  writeUInt32BE(out, h0 >>> 0, 0);
  writeUInt32BE(out, h1 >>> 0, 4);
  writeUInt32BE(out, h2 >>> 0, 8);
  writeUInt32BE(out, h3 >>> 0, 12);
  writeUInt32BE(out, h4 >>> 0, 16);
  writeUInt32BE(out, h5 >>> 0, 20);
  writeUInt32BE(out, h6 >>> 0, 24);
  writeUInt32BE(out, h7 >>> 0, 28);
  return out;
}

class ChaoticPRNG {
  constructor(seedBuffer) {
    let sum = 0;
    for (let i = 0; i < seedBuffer.length; i++) {
      sum = (sum * 251 + seedBuffer[i]) % 1000000007;
    }
    this.x = 0.123456789 + (sum % 700000000) / 1000000000;
    this.r = 3.9999 + ((sum % 10000) / 100000000);
    
    for (let i = 0; i < 128; i++) {
      this.next();
    }
  }

  next() {
    this.x = this.r * this.x * (1.0 - this.x);
    return this.x;
  }

  nextByte() {
    const fractional = Math.floor(this.next() * 1e12);
    return fractional % 256;
  }
}

function decryptBlock(encBlockData, key, blockIndex) {
  const L = encBlockData.length;
  if (L === 0) return new Uint8Array(0);

  const blockSeed = customHash256(key + ":" + blockIndex);
  const prng = new ChaoticPRNG(blockSeed);

  const sbox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    sbox[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    const tmp = sbox[i];
    sbox[i] = sbox[j];
    sbox[j] = tmp;
  }
  const invSbox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    invSbox[sbox[i]] = i;
  }

  const output = new Uint8Array(L);
  let state = (blockSeed[0] << 24) | (blockSeed[1] << 16) | (blockSeed[2] << 8) | blockSeed[3];

  for (let i = 0; i < L; i++) {
    state = Math.imul(state, 1664525) + 1013904223;
    const keyByte = (state >>> 24) & 0xFF;
    const substitutedByte = encBlockData[i] ^ keyByte;
    output[i] = invSbox[substitutedByte];
  }

  return output;
}

function decryptBuffer(buffer, key) {
  const chunks = [];
  const totalBlocks = Math.ceil(buffer.length / BLOCK_SIZE);
  
  for (let b = 0; b < totalBlocks; b++) {
    const start = b * BLOCK_SIZE;
    const end = Math.min(start + BLOCK_SIZE, buffer.length);
    const block = buffer.subarray(start, end);
    const decryptedBlock = decryptBlock(block, key, b);
    chunks.push(decryptedBlock);
  }
  
  let totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  let result = new Uint8Array(totalLength);
  let offset = 0;
  for (let chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// --- App Control Logic ---
const localHosts = ['localhost', '127.0.0.1', '::1', '[::1]', '::', '[::]', '0.0.0.0', '[0.0.0.0]'];
const isLocal = localHosts.includes(window.location.hostname) || 
                window.location.hostname.startsWith('192.168.') || 
                window.location.hostname.startsWith('10.') || 
                window.location.hostname.endsWith('.local');
const API_BASE = isLocal ? 'http://localhost:5000' : window.location.origin;

let adminToken = sessionStorage.getItem('adminToken') || '';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordInput = document.getElementById('admin-password');
const terminalLogsBox = document.getElementById('terminal-logs-box');
const usersTableBody = document.getElementById('users-table-body');
const bansTableBody = document.getElementById('bans-table-body');
const statTotalUsers = document.getElementById('stat-total-users');
const statBannedIps = document.getElementById('stat-banned-ips');
const statLatency = document.getElementById('stat-latency');
const logoutBtn = document.getElementById('logout-btn');

function logTerminal(message, type = 'green') {
  const line = document.createElement('div');
  line.className = `log-line text-${type}`;
  const timestamp = new Date().toISOString().split('T')[1].substr(0, 8);
  line.innerText = `[${timestamp}] ${message}`;
  terminalLogsBox.appendChild(line);
  terminalLogsBox.scrollTop = terminalLogsBox.scrollHeight;
}

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    const panelId = btn.getAttribute('data-tab');
    document.getElementById(panelId).classList.add('active');
    logTerminal(`Switched workspace view to: ${btn.innerText.trim()}`, 'yellow');
  });
});

async function apiRequest(endpoint, options = {}) {
  const start = Date.now();
  const headers = options.headers || {};
  if (adminToken) {
    headers['x-admin-token'] = adminToken;
  }
  
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    
    const latency = Date.now() - start;
    statLatency.innerText = `${latency}ms`;
    
    if (res.status === 403) {
      logTerminal(`GATEWAY ERROR 403: Access Revoked. IP Banned.`, 'red');
      alert("FORBIDDEN: IP is currently blocked.");
      sessionStorage.clear();
      window.location.reload();
      throw new Error("Banned");
    }

    if (res.status === 401) {
      logTerminal(`SESSION EXPIRED: Invalid admin token. Redirecting to login...`, 'red');
      sessionStorage.clear();
      adminToken = '';
      setTimeout(() => {
        loginContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
      }, 1000);
      return res;
    }
    
    return res;
  } catch (err) {
    if (err.message !== "Banned") {
      logTerminal(`NETWORK FAILURE connecting to endpoint: ${endpoint}`, 'red');
    }
    throw err;
  }
}

// Authentication
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  
  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value;
  
  logTerminal(`INITIATING HANDSHAKE: Requesting validation block cipher for ${email}...`, 'yellow');
  
  try {
    const res = await apiRequest('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      logTerminal(`AUTHENTICATION CYCLE FAILED: ${data.error || 'Invalid Identity'}`, 'red');
      loginError.innerText = data.error || 'Authentication Failed';
      loginError.classList.remove('hidden');
      return;
    }
    
    const securePayloadHex = data.securePayload;
    if (!securePayloadHex) {
      throw new Error("Corrupted server response. No cryptographic payload received.");
    }
    
    logTerminal(`PAYLOAD RECEIVED. Attempting locally-computed decryption using cipher passcode...`, 'yellow');
    
    let decryptedText;
    try {
      const encryptedBytes = hexToBytes(securePayloadHex);
      const decryptedBytes = decryptBuffer(encryptedBytes, password);
      decryptedText = new TextDecoder().decode(decryptedBytes);
    } catch (decryptErr) {
      logTerminal(`DECRYPTION CRITICAL FAILURE: Decoupled Bit-Scrambler key mismatch.`, 'red');
      loginError.innerText = "Decryption Failed: Key signature mismatch.";
      loginError.classList.remove('hidden');
      return;
    }
    
    let payload;
    try {
      payload = JSON.parse(decryptedText);
    } catch (parseErr) {
      logTerminal(`DECRYPTION FAILURE: Decrypted stream is corrupted.`, 'red');
      loginError.innerText = "Decryption Failed: Mismatched signature block.";
      loginError.classList.remove('hidden');
      return;
    }
    
    if (payload.status !== 'success' || !payload.token) {
      logTerminal(`VERIFICATION FAILURE: Decrypted verification status is false.`, 'red');
      loginError.innerText = "Dynamic validation failed. Access denied.";
      loginError.classList.remove('hidden');
      return;
    }
    
    logTerminal(`DECRYPTION EXECUTED SUCCESS: Session Signature Decoded. Token matching OK.`, 'green');
    adminToken = payload.token;
    sessionStorage.setItem('adminToken', adminToken);
    
    // Transition UI
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    logTerminal(`GATEWAY KEY VERIFIED. Administrative root shell established.`, 'green');
    
    loadDashboard();
    
  } catch (err) {
    console.error(err);
  }
});

async function loadDashboard() {
  logTerminal(`Synchronizing SQLite database records...`, 'yellow');
  await Promise.all([
    fetchUsers(),
    fetchBans(),
    fetchSupportRequests()
  ]);
  logTerminal(`Synchronization complete. Stats matching OK.`, 'green');
}

async function fetchUsers() {
  try {
    const res = await apiRequest('/api/admin/users');
    if (!res.ok) return;
    
    const users = await res.json();
    statTotalUsers.innerText = users.length;
    
    usersTableBody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td><img class="avatar-mini" src="${u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}" alt=""></td>
        <td><strong>@${u.username}</strong></td>
        <td><span style="color: var(--text-accent)">${u.niche || 'Web Development'}</span></td>
        <td><code>${u.tag || '--'}</code></td>
        <td>${u.socialUrl ? `<a href="${u.socialUrl}" target="_blank" class="text-btn">Link</a>` : 'None'}</td>
        <td>
          <button class="action-btn unban-btn" style="background: #ef4444; border-color: #ef4444;" onclick="revokeUser(${u.id}, '${u.username}')">REVOKE</button>
        </td>
      `;
      usersTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function fetchSupportRequests() {
  try {
    const res = await apiRequest('/api/admin/support-requests');
    if (!res.ok) return;
    
    const requests = await res.json();
    const tableBody = document.getElementById('support-table-body');
    tableBody.innerHTML = '';
    
    if (requests.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No support tickets reported.</td>
        </tr>
      `;
      return;
    }
    
    requests.forEach(r => {
      const tr = document.createElement('tr');
      const formattedDate = new Date(r.createdAt).toLocaleString();
      const typeLabel = r.type === 'error' ? '⚠️ ERROR' : '💡 FEATURE';
      const typeColor = r.type === 'error' ? 'red' : 'green';
      
      tr.innerHTML = `
        <td>${r.id}</td>
        <td><strong>@${r.username || 'Anonymous'}</strong></td>
        <td><span class="text-${typeColor}">${typeLabel}</span></td>
        <td style="max-width: 300px; word-wrap: break-word; white-space: normal;">${r.description}</td>
        <td>${formattedDate}</td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

window.revokeUser = async function(userId, username) {
  const reason = prompt(`Specify the reason for revoking user @${username}:`, "Violation of Content Policy");
  if (reason === null) return;
  
  if (!confirm(`CONFIRM ACCOUNT REVOCATION:\nAre you sure you want to permanently delete user @${username} and notify them via email?`)) return;
  
  logTerminal(`REVOKING USER: Dispatching delete sequence for @${username}...`, 'yellow');
  
  try {
    const res = await apiRequest(`/api/admin/users/${userId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    
    if (res.ok) {
      logTerminal(`REVOKE SUCCESS: User @${username} has been removed and notified.`, 'green');
      await fetchUsers();
    } else {
      const errData = await res.json();
      logTerminal(`REVOKE FAILURE: ${errData.error || 'Failed to complete transaction'}`, 'red');
    }
  } catch (err) {
    console.error(err);
  }
};

async function fetchBans() {
  try {
    const res = await apiRequest('/api/admin/banned-ips');
    if (!res.ok) return;
    
    const bans = await res.json();
    statBannedIps.innerText = bans.length;
    
    bansTableBody.innerHTML = '';
    if (bans.length === 0) {
      bansTableBody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center">No banned IP addresses registered.</td>
        </tr>
      `;
      return;
    }
    
    bans.forEach(b => {
      const tr = document.createElement('tr');
      const formattedDate = new Date(b.bannedAt).toLocaleString();
      tr.innerHTML = `
        <td><code class="text-red">${b.ip}</code></td>
        <td>${formattedDate}</td>
        <td>
          <button class="action-btn unban-btn" onclick="unbanIpAddress('${b.ip}')">REVOKE BAN</button>
        </td>
      `;
      bansTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

window.unbanIpAddress = async function(ip) {
  if (!confirm(`Are you sure you want to unban and restore access for IP ${ip}?`)) return;
  logTerminal(`UNBAN TRANSACTION: Revoking block on IP ${ip}...`, 'yellow');
  
  try {
    const res = await apiRequest('/api/admin/unban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    
    if (res.ok) {
      logTerminal(`UNBAN SUCCESS: IP ${ip} unblocked. Database entry removed.`, 'green');
      await fetchBans();
    } else {
      logTerminal(`UNBAN FAILURE: Unable to unban IP ${ip}.`, 'red');
    }
  } catch (err) {
    console.error(err);
  }
};

// Logout Shutdown
logoutBtn.addEventListener('click', () => {
  logTerminal(`SHUTTING DOWN SESSION: Cleared tokens from session register.`, 'red');
  sessionStorage.clear();
  setTimeout(() => {
    window.location.reload();
  }, 1000);
});

// Auto login if session active
if (adminToken) {
  loginContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');
  logTerminal(`RESTORED EXECUTING SESSION: Token registry valid. Loading root workspace...`, 'green');
  loadDashboard();
}
