// routes/news.js (JWT-based fixed version)
import express from 'express';
import axios from 'axios';
import pool from '../config/database.js';
import { generateEmbedding } from '../services/embedding.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const HN_API_BASE = process.env.HACKERNEWS_API_BASE;

// 1. Fetch top stories and store in DB
router.get('/fetch', async (req, res) => {
  try {
    const topResponse = await axios.get(`${HN_API_BASE}/topstories.json`);
    const ids = topResponse.data.slice(0, 30);

    const stories = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await axios.get(`${HN_API_BASE}/item/${id}.json`);
          const story = response.data;

          if (!story || !story.title) return null;

          const unixTime = Number.isFinite(story.time) ? story.time : Math.floor(Date.now() / 1000);
          const source = story.url ? new URL(story.url).hostname.replace('www.', '') : 'hackernews';
          const embedding = await generateEmbedding(`${story.title} ${story.text || ''}`);

          await pool.query(`
            INSERT INTO articles (
              id, title, url, score, author, time, descendants, type,
              content, source, category, tags, relevance_score,
              published_at, keywords, embedding
            )
            VALUES ($1,$2,$3,$4,$5,$6::BIGINT,$7,$8,$9,$10,$11,$12,$13,to_timestamp($6::BIGINT),$14,$15)
            ON CONFLICT (id) DO UPDATE SET
              score = EXCLUDED.score,
              descendants = EXCLUDED.descendants,
              fetched_at = CURRENT_TIMESTAMP;
          `, [
            story.id, story.title, story.url || '', story.score || 0, story.by || '',
            unixTime, story.descendants || 0, story.type || '', story.text || '', source,
            null, [], 0.0, story.keywords || [], embedding
          ]);

          return story;
        } catch {
          return null;
        }
      })
    );

    res.json(stories.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top stories' });
  }
});

// 2. Top stories
router.get('/top-stories', async (req, res) => {
  const result = await pool.query(`SELECT * FROM articles ORDER BY score DESC, descendants DESC LIMIT 30`);
  res.json(result.rows);
});

// 3. Latest
router.get('/latest', async (req, res) => {
  const result = await pool.query(`SELECT * FROM articles ORDER BY published_at DESC LIMIT 20`);
  res.json(result.rows);
});

// 4. Hot
router.get('/hot', async (req, res) => {
  const result = await pool.query(`SELECT * FROM articles ORDER BY score DESC, descendants DESC LIMIT 20`);
  res.json(result.rows);
});

// 5. Recommendations (JWT auth)
router.get('/recommendations/:userId', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);

  const prefs = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId]);
  const keywords = prefs.rows[0]?.preferences?.keywords || [];
  const sources = prefs.rows[0]?.preferences?.sources || [];

  const result = await pool.query(`
    SELECT * FROM articles
    WHERE published_at > NOW() - INTERVAL '7 days'
    AND ($1::text[] IS NULL OR EXISTS (
      SELECT 1 FROM unnest(keywords) k WHERE k = ANY($1)
    ))
    AND ($2::text[] IS NULL OR source = ANY($2))
    ORDER BY score DESC LIMIT 20;
  `, [keywords.length ? keywords : null, sources.length ? sources : null]);

  res.json(result.rows);
});

// 6. Saved articles
router.get('/saved/:userId', requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);

  const result = await pool.query(`
    SELECT a.* FROM user_interactions i
    JOIN articles a ON a.id = i.article_id
    WHERE i.user_id = $1 AND i.interaction_type = 'like'
    ORDER BY i.interaction_time DESC
  `, [userId]);

  res.json(result.rows);
});

// 7. Record interaction
router.post('/interaction', requireAuth, async (req, res) => {
  const { userId, articleId, interactionType } = req.body;

  if (!['like', 'dislike', 'read', 'bookmark', 'view'].includes(interactionType)) {
    return res.status(400).json({ error: 'Invalid interaction type' });
  }

  await pool.query(`
    INSERT INTO user_interactions (user_id, article_id, interaction_type)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `, [userId, articleId, interactionType]);

  res.json({ success: true });
});

// 8. Related articles
router.get('/related/:articleId', async (req, res) => {
  const { articleId } = req.params;
  const result = await pool.query(`
    SELECT * FROM articles
    WHERE id != $1 AND embedding IS NOT NULL
    ORDER BY embedding <#> (SELECT embedding FROM articles WHERE id = $1)
    LIMIT 5;
  `, [articleId]);

  res.json(result.rows);
});

export default router;