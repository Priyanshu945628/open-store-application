import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

(async () => {
  try {
    const dbPath = path.resolve('database.sqlite');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    const follows = await db.all('SELECT * FROM follows');
    const users = await db.all('SELECT id, username FROM users');
    console.log('Users:');
    console.log(users);
    console.log('\nFollows:');
    console.log(follows);
    await db.close();
  } catch (err) {
    console.error('Error reading database:', err);
  }
})();
