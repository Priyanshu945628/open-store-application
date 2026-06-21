/**
 * test-github-token.js
 * ─────────────────────────────────────────────────────────────────
 * Tests whether the GitHub PAT in .env can:
 *  1. Authenticate (GET /user)
 *  2. Read the target repo (GET /repos/:owner/:repo)
 *  3. Upload a small test file (PUT /repos/:owner/:repo/contents/…)
 *  4. Delete the test file afterwards (cleanup)
 * ─────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_OWNER;
const REPO  = process.env.GITHUB_REPO;

const GREEN  = '\x1b[32m✔\x1b[0m';
const RED    = '\x1b[31m✘\x1b[0m';
const YELLOW = '\x1b[33m⚠\x1b[0m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

function pass(msg) { console.log(`  ${GREEN} ${msg}`); }
function fail(msg) { console.log(`  ${RED} ${msg}`); }
function warn(msg) { console.log(`  ${YELLOW} ${msg}`); }

async function ghFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `token ${TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Open-Store-Token-Test',
      ...(options.headers || {})
    }
  });
}

async function run() {
  console.log(`\n${BOLD}═══════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Open Store — GitHub Token Permissions Test  ${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════${RESET}\n`);

  // ── 0. Check .env values are present ──────────────────────────
  console.log(`${BOLD}[0] Checking .env configuration…${RESET}`);
  if (!TOKEN) { fail('GITHUB_TOKEN is empty in .env'); process.exit(1); }
  if (!OWNER) { fail('GITHUB_OWNER is empty in .env'); process.exit(1); }
  if (!REPO)  { fail('GITHUB_REPO is empty in .env');  process.exit(1); }
  pass(`GITHUB_TOKEN  = ${TOKEN.slice(0, 12)}… (${TOKEN.length} chars)`);
  pass(`GITHUB_OWNER  = ${OWNER}`);
  pass(`GITHUB_REPO   = ${REPO}`);

  // ── 1. Verify authentication ───────────────────────────────────
  console.log(`\n${BOLD}[1] Verifying token authentication (GET /user)…${RESET}`);
  const userRes = await ghFetch('/user');
  if (!userRes.ok) {
    fail(`Authentication failed: ${userRes.status} ${userRes.statusText}`);
    const body = await userRes.json().catch(() => ({}));
    fail(`  → ${body.message || 'Unknown error'}`);
    process.exit(1);
  }
  const userData = await userRes.json();
  pass(`Authenticated as: @${userData.login} (${userData.name || 'no display name'})`);

  // Check token scopes from response headers
  const scopes = userRes.headers.get('x-oauth-scopes') || '(none listed)';
  console.log(`     Token scopes: ${BOLD}${scopes}${RESET}`);
  if (scopes.includes('repo') || scopes.includes('public_repo')) {
    pass(`Token has 'repo' scope — write access confirmed`);
  } else {
    warn(`Token scopes don't explicitly show 'repo'. Fine-grained PATs may still work.`);
  }

  // ── 2. Check repo access ───────────────────────────────────────
  console.log(`\n${BOLD}[2] Checking repository access (GET /repos/${OWNER}/${REPO})…${RESET}`);
  const repoRes = await ghFetch(`/repos/${OWNER}/${REPO}`);
  if (!repoRes.ok) {
    fail(`Repo not accessible: ${repoRes.status} ${repoRes.statusText}`);
    const body = await repoRes.json().catch(() => ({}));
    fail(`  → ${body.message || 'Unknown error'}`);
    process.exit(1);
  }
  const repoData = await repoRes.json();
  pass(`Repo found: ${repoData.full_name} (${repoData.private ? 'private' : 'public'})`);
  pass(`Default branch: ${repoData.default_branch}`);

  // ── 3. Upload a test file ─────────────────────────────────────
  const testFilename = `_test_upload_${Date.now()}.txt`;
  const testContent  = `Open Store token test — ${new Date().toISOString()}`;
  const contentB64   = Buffer.from(testContent).toString('base64');

  console.log(`\n${BOLD}[3] Uploading test file: ${testFilename}…${RESET}`);
  const uploadRes = await ghFetch(
    `/repos/${OWNER}/${REPO}/contents/${testFilename}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[test] Upload check by Open Store token tester`,
        content: contentB64
      })
    }
  );

  if (!uploadRes.ok) {
    const errBody = await uploadRes.json().catch(() => ({}));
    fail(`Upload FAILED: ${uploadRes.status} ${uploadRes.statusText}`);
    fail(`  → ${errBody.message || JSON.stringify(errBody)}`);

    if (uploadRes.status === 403) {
      console.log(`\n  ${YELLOW}Hint: The token exists but lacks write (repo) permission.`);
      console.log(`         Go to GitHub → Settings → Developer Settings → Personal Access Tokens`);
      console.log(`         For Fine-grained PAT: enable "Contents" → Read & Write`);
      console.log(`         For Classic PAT: tick the 'repo' scope checkbox${RESET}`);
    }
    if (uploadRes.status === 404) {
      console.log(`\n  ${YELLOW}Hint: The repo '${OWNER}/${REPO}' was not found.`);
      console.log(`         Check GITHUB_OWNER and GITHUB_REPO in .env${RESET}`);
    }
    process.exit(1);
  }

  const uploadData = await uploadRes.json();
  const fileSha    = uploadData.content.sha;
  pass(`File uploaded successfully!`);
  pass(`  SHA: ${fileSha}`);
  pass(`  URL: ${uploadData.content.html_url}`);

  // ── 4. Clean up — delete the test file ───────────────────────
  console.log(`\n${BOLD}[4] Cleaning up — deleting test file…${RESET}`);
  const deleteRes = await ghFetch(
    `/repos/${OWNER}/${REPO}/contents/${testFilename}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[test] Cleanup test file`,
        sha: fileSha
      })
    }
  );

  if (!deleteRes.ok) {
    warn(`Cleanup failed (${deleteRes.status}) — you may need to delete '${testFilename}' manually from the repo.`);
  } else {
    pass(`Test file deleted from repo — no leftover files.`);
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log(`\n${BOLD}═══════════════════════════════════════════════${RESET}`);
  console.log(`${GREEN} ${BOLD}ALL CHECKS PASSED — Token can upload files!${RESET}`);
  console.log(`${BOLD}   Restart the backend server to activate GitHub storage.${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════${RESET}\n`);
}

run().catch(err => {
  console.error(`\n${RED} Unexpected error:`, err.message);
  process.exit(1);
});
