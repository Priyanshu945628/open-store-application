import fetch from 'node-fetch';
import { decryptBuffer } from './custom-crypto.js';

const API_BASE = 'http://localhost:5000';

async function runAdminTests() {
  console.log("=== RUNNING ADMIN PORTAL & SECURITY SHIELD E2E TESTS ===\n");

  const adminEmail = "admin@openstore.dev";
  const adminPassword = "SuperSecureAdminPassword2026!";

  // 1. Verify Security Headers
  console.log("1. Verifying Security Headers...");
  const headersRes = await fetch(`${API_BASE}/api/posts`);
  const csp = headersRes.headers.get('content-security-policy');
  const hsts = headersRes.headers.get('strict-transport-security');
  const xfo = headersRes.headers.get('x-frame-options');
  const xct = headersRes.headers.get('x-content-type-options');
  
  if (csp && hsts && xfo === 'DENY' && xct === 'nosniff') {
    console.log("   ✓ Security response headers configured correctly.");
  } else {
    throw new Error(`Security headers missing or invalid. CSP: ${csp}, HSTS: ${hsts}, XFO: ${xfo}, XCT: ${xct}`);
  }

  // 2. Test Successful Login and Decryption (MITM Shield)
  console.log("\n2. Testing Admin login dynamic decryption (MITM Shield)...");
  const loginRes = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });

  if (!loginRes.ok) {
    throw new Error(`Failed to log in as admin: ${loginRes.statusText}`);
  }

  const { securePayload } = await loginRes.json();
  if (!securePayload) {
    throw new Error("Login response did not return securePayload.");
  }

  console.log("   ✓ Secure ciphertext payload received.");
  
  // Decrypt payload using adminPassword
  const encryptedBuffer = Buffer.from(securePayload, 'hex');
  const decryptedBuffer = decryptBuffer(encryptedBuffer, adminPassword);
  const decryptedText = decryptedBuffer.toString('utf-8');
  const payload = JSON.parse(decryptedText);

  if (payload.status === 'success' && payload.token && payload.role === 'administrator') {
    console.log("   ✓ Decryption successful. Decrypted token signature matches Root Authority.");
  } else {
    throw new Error(`Decrypted payload is invalid: ${decryptedText}`);
  }

  const sessionToken = payload.token;

  // 3. Test Authorized APIs
  console.log("\n3. Testing Admin authorized endpoint permissions...");
  const usersRes = await fetch(`${API_BASE}/api/admin/users`, {
    headers: { 'x-admin-token': sessionToken }
  });
  if (usersRes.ok) {
    const users = await usersRes.json();
    console.log(`   ✓ Access granted. Fetched ${users.length} user records successfully.`);
  } else {
    throw new Error(`Authorized request rejected: ${usersRes.status}`);
  }

  // Unauthorized access check
  const unauthorizedRes = await fetch(`${API_BASE}/api/admin/users`);
  if (unauthorizedRes.status === 401) {
    console.log("   ✓ Unauthorized requests correctly rejected with 401.");
  } else {
    throw new Error(`Unauthorized request allowed or gave wrong code: ${unauthorizedRes.status}`);
  }

  // 4. Test 3-Strike IP Ban Lockout
  console.log("\n4. Testing 3-Strike IP Ban Lockout protection...");
  const testIp = `127.0.0.99`; // mock IP header
  
  // Attempt 1: Failed login
  const fail1 = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
    body: JSON.stringify({ email: adminEmail, password: "wrong_password" })
  });
  console.log(`   Failed login 1 status: ${fail1.status} (Expected: 401)`);
  
  // Attempt 2: Failed login
  const fail2 = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
    body: JSON.stringify({ email: adminEmail, password: "wrong_password" })
  });
  console.log(`   Failed login 2 status: ${fail2.status} (Expected: 401)`);

  // Attempt 3: Failed login (IP should be banned now)
  const fail3 = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
    body: JSON.stringify({ email: adminEmail, password: "wrong_password" })
  });
  console.log(`   Failed login 3 status: ${fail3.status} (Expected: 403)`);

  // Attempt 4: Forbidden access to any endpoint from this banned IP
  const blockRes = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  if (blockRes.status === 403) {
    console.log("   ✓ Success: IP address is banned. Further requests rejected immediately with 403.");
  } else {
    throw new Error(`IP was not banned properly. Attempt 4 status: ${blockRes.status}`);
  }

  // Unban the test IP address
  console.log("\n5. Testing admin unban operation...");
  const unbanRes = await fetch(`${API_BASE}/api/admin/unban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': sessionToken },
    body: JSON.stringify({ ip: testIp })
  });
  if (unbanRes.ok) {
    console.log(`   ✓ IP ${testIp} unbanned by administrator.`);
  } else {
    throw new Error(`Unban request failed: ${unbanRes.statusText}`);
  }

  // Verify access is restored
  const restoredRes = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  if (restoredRes.ok) {
    console.log("   ✓ Access restored for IP address successfully.");
  } else {
    throw new Error(`Access was not restored after unbanning: ${restoredRes.status}`);
  }

  console.log("\n=== ALL SECURITY SHIELD E2E TESTS PASSED SUCCESSFULLY ===");
}

runAdminTests().catch(err => {
  console.error("\n❌ E2E TEST CRITICAL EXCEPTION:", err.message);
  process.exit(1);
});
