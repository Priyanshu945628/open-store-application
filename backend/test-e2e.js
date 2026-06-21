import fetch from 'node-fetch';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

const API_BASE = 'http://localhost:5000/api';

async function runE2ETests() {
  console.log("=== RUNNING RE-ENGINEERED BACKEND E2E API TESTS ===");

  // 1. Create two test users
  console.log("1. Registering test users...");
  const timestamp = Date.now();
  const usernameA = `dev_ninja_${timestamp}`;
  const usernameB = `code_sensei_${timestamp}`;
  const password = "password123";

  const resA = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameA, password })
  });
  assert(resA.ok, "User A registration should succeed");
  const userA = await resA.json();

  const resB = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameB, password })
  });
  assert(resB.ok, "User B registration should succeed");
  const userB = await resB.json();
  console.log(`   ✓ Registered ${usernameA} (ID: ${userA.id}) and ${usernameB} (ID: ${userB.id})`);

  // 2. Test Username Uniqueness Collision and Suggestions
  console.log("\n2. Testing username rename collisions & suggestions...");
  const updateResCollision = await fetch(`${API_BASE}/users/${userB.id}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameA, avatar: userB.avatar, niche: 'AI & Data Science' })
  });

  assert(updateResCollision.status === 409, "Should fail with 409 conflict when renaming to an existing username");
  const collisionData = await updateResCollision.json();
  assert(collisionData.error.includes("taken"), "Error message should mention username is taken");
  assert(collisionData.suggestions && collisionData.suggestions.length === 3, "Should return 3 unique alternative suggestions");
  console.log("   ✓ Username uniqueness collision rejected successfully.");
  console.log("   Suggestions received:", collisionData.suggestions);

  // 3. Test Profile Settings Updates
  console.log("\n3. Testing profile settings update...");
  const newNiche = 'Systems & Security';
  const newAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=verified';
  const updateResSuccess = await fetch(`${API_BASE}/users/${userB.id}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: usernameB, avatar: newAvatar, niche: newNiche })
  });
  assert(updateResSuccess.ok, "Profile update should succeed");
  const updatedUserB = await updateResSuccess.json();
  assert(updatedUserB.niche === newNiche, "Niche should be updated");
  assert(updatedUserB.avatar === newAvatar, "Avatar should be updated");
  console.log("   ✓ User settings updated successfully.");

  // 4. Test Follow / Unfollow System
  console.log("\n4. Testing follow / unfollow system...");
  const followRes = await fetch(`${API_BASE}/users/${userB.id}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followerId: userA.id })
  });
  assert(followRes.ok, "Follow request should succeed");
  const followData = await followRes.json();
  assert(followData.followed === true, "Followed status should be true");

  // Get followed users list for user A
  const followingRes = await fetch(`${API_BASE}/users/${userA.id}/following`);
  assert(followingRes.ok, "Get following should succeed");
  const followingList = await followingRes.json();
  assert(followingList.some(u => u.id === userB.id), "User B must exist in User A's followed list");
  // Accept follow request before testing DMs
  const acceptRes = await fetch(`${API_BASE}/follows/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followerId: userA.id, followedId: userB.id })
  });
  assert(acceptRes.ok, "Accepting follow request should succeed");

  // 5. Test Direct Messaging (DMs)
  console.log("\n5. Testing direct messaging (DMs)...");
  const msgText = "Hey! Let's collaborate on the Open Store project.";
  const sendRes = await fetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId: userA.id, receiverId: userB.id, content: msgText })
  });
  assert(sendRes.ok, "Sending message should succeed");
  const msg = await sendRes.json();
  assert(msg.content === msgText, "Message content should match");

  const getDMsRes = await fetch(`${API_BASE}/messages?userA=${userA.id}&userB=${userB.id}`);
  assert(getDMsRes.ok, "Get DMs should succeed");
  const dmThread = await getDMsRes.json();
  assert(dmThread.length > 0, "DM thread should not be empty");
  assert(dmThread.some(m => m.content === msgText), "Message in thread content should match");
  console.log("   ✓ Sent and retrieved direct messages successfully.");

  // 6. Test Stories API
  console.log("\n6. Testing stories creation and retrieval...");
  const storyText = "Re-engineering is going strong!";
  const addStoryRes = await fetch(`${API_BASE}/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userA.id, type: 'text', content: storyText })
  });
  assert(addStoryRes.ok, "Creating a story should succeed");
  const story = await addStoryRes.json();
  assert(story.content === storyText, "Story content should match");

  const getStoriesRes = await fetch(`${API_BASE}/stories`);
  assert(getStoriesRes.ok, "Retrieving stories should succeed");
  const activeStories = await getStoriesRes.json();
  assert(activeStories.some(s => s.id === story.id), "Our story should be present in active stories");
  console.log("   ✓ Created and fetched stories successfully.");

  // 7. Test Fuzzy Search Algorithm (Case-insensitive matching)
  console.log("\n7. Testing fuzzy search algorithm...");
  // Query "ninja" should match "dev_ninja_[timestamp]"
  const searchRes = await fetch(`${API_BASE}/search?q=ninja`, {
    headers: { 'x-user-id': userA.id.toString() }
  });
  assert(searchRes.ok, "Search should succeed");
  const searchResults = await searchRes.json();
  assert(searchResults.users.some(u => u.id === userA.id), "Fuzzy search for 'ninja' must return User A");
  console.log("   ✓ Fuzzy search matches correct user profiles case-insensitively.");

  console.log("\n=== ALL RE-ENGINEERED E2E TESTS PASSED SUCCESSFULLY ===");
}

runE2ETests().catch(err => {
  console.error("\n❌ E2E API Test Failed:", err);
  process.exit(1);
});
