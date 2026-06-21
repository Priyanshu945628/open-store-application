import fetch from 'node-fetch';
import { decryptBuffer } from './custom-crypto.js';

const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log("=== RUNNING SUPPORT TICKETS & USER REVOCATION TEST SUITE ===\n");

  const adminEmail = "admin@openstore.dev";
  const adminPassword = "SuperSecureAdminPassword2026!";

  // 1. Get Admin Session Token
  console.log("1. Authenticating as Administrator...");
  const loginRes = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.statusText}`);
  }

  const { securePayload } = await loginRes.json();
  const encryptedBuffer = Buffer.from(securePayload, 'hex');
  const decryptedBuffer = decryptBuffer(encryptedBuffer, adminPassword);
  const decryptedText = decryptedBuffer.toString('utf-8');
  const payload = JSON.parse(decryptedText);
  const sessionToken = payload.token;
  console.log("   ✓ Admin authenticated. Token retrieved.");

  // 2. Submit Support Ticket (Error Report)
  console.log("\n2. Submitting Support Ticket (System Bug)...");
  const ticketRes = await fetch(`${API_BASE}/api/support-requests`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': '9999' // mock test user
    },
    body: JSON.stringify({ 
      type: 'error', 
      description: 'Test Error: Uncaught TypeMismatch inside video player container.' 
    })
  });

  if (ticketRes.ok) {
    const data = await ticketRes.json();
    console.log(`   ✓ Support ticket submitted successfully. ID: ${data.requestId}`);
  } else {
    throw new Error(`Failed to submit support ticket: ${ticketRes.status}`);
  }

  // 3. Fetch Support Tickets via Admin endpoint
  console.log("\n3. Fetching Support Tickets as Admin...");
  const fetchTicketsRes = await fetch(`${API_BASE}/api/admin/support-requests`, {
    headers: { 'x-admin-token': sessionToken }
  });

  if (fetchTicketsRes.ok) {
    const list = await fetchTicketsRes.json();
    console.log(`   ✓ Fetched ${list.length} support requests successfully.`);
    const item = list.find(r => r.description.includes('Uncaught TypeMismatch'));
    if (item) {
      console.log(`   ✓ Verified ticket content matches: "${item.description}"`);
    } else {
      throw new Error("Submitted ticket not found in fetched list.");
    }
  } else {
    throw new Error(`Failed to fetch support tickets: ${fetchTicketsRes.status}`);
  }

  // 4. Test User Revocation
  console.log("\n4. Registering a dummy user to test revocation...");
  // Let's sign up a test user first
  const uniqueUsername = `revoke_user_${Date.now()}`;
  const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: uniqueUsername,
      password: 'password123',
      email: 'revoke_test@gmail.com'
    })
  });

  if (!registerRes.ok) {
    const regError = await registerRes.json();
    throw new Error(`Dummy user registration failed: ${JSON.stringify(regError)}`);
  }

  const regData = await registerRes.json();
  const testUserId = regData.userId;
  console.log(`   ✓ Registered dummy user @${uniqueUsername} with ID: ${testUserId}`);

  console.log("\n5. Revoking dummy user account as Admin...");
  const revokeRes = await fetch(`${API_BASE}/api/admin/users/${testUserId}/revoke`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-token': sessionToken 
    },
    body: JSON.stringify({ 
      reason: 'Violation of Content Policy: Uploaded unauthorized copywritten media.' 
    })
  });

  if (revokeRes.ok) {
    console.log("   ✓ User revoked successfully. Verification email dispatched.");
  } else {
    throw new Error(`Failed to revoke user: ${revokeRes.status}`);
  }

  // 6. Verify user deletion
  console.log("\n6. Verifying revoked user is deleted...");
  const checkUsersRes = await fetch(`${API_BASE}/api/admin/users`, {
    headers: { 'x-admin-token': sessionToken }
  });
  if (checkUsersRes.ok) {
    const users = await checkUsersRes.json();
    const deletedUser = users.find(u => u.id === testUserId);
    if (!deletedUser) {
      console.log("   ✓ Success: Revoked user no longer exists in database.");
    } else {
      throw new Error("Failed user deletion: user still exists in database.");
    }
  } else {
    throw new Error("Failed to verify user deletion.");
  }

  console.log("\n=== ALL REVOCATION AND SUPPORT TESTS COMPLETED SUCCESSFULLY ===");
}

runTests().catch(err => {
  console.error("\n❌ TEST EXCEPTION:", err.message);
  process.exit(1);
});
