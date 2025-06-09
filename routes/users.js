import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ✅ Register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashed]
    );

    const token = generateToken(result.rows[0]);
    res.json({ token, user: result.rows[0] });
  } catch (err) {
    console.error('❌ Register failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('❌ Login failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Get own profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, preferences FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Update preferences
router.put('/:userId/preferences', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;

  if (parseInt(userId) !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: You can only update your own preferences' });
  }

  try {
    await pool.query(
      'UPDATE users SET preferences = $1 WHERE id = $2',
      [preferences, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to update preferences:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
