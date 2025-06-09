import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware/auth.js'; // JWT middleware

import newsRoutes from './routes/news.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3001;

// __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './frontend')));

// API routes
app.use('/api/news', newsRoutes);
app.use('/api/users', userRoutes);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// 🔐 Example protected route (test with Authorization: Bearer <token>)
app.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
