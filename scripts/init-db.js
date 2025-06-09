import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createTables() {
  try {
    console.log('🔧 Creating tables...');

    await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // ✅ Users table for JWT
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        preferences JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 📰 Articles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id BIGINT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT,
        score INTEGER,
        author TEXT,
        time BIGINT,
        descendants INTEGER,
        type TEXT,
        content TEXT DEFAULT '',
        source TEXT,
        category TEXT,
        tags TEXT[],
        relevance_score REAL DEFAULT 0,
        published_at TIMESTAMP,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        keywords TEXT[],
        embedding vector(1536)
      );
    `);

    // 👥 User interactions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_interactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
        interaction_type TEXT CHECK (
          interaction_type IN ('like', 'dislike', 'bookmark', 'view', 'read')
        ),
        interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 📖 Reading history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_reading_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 💾 Saved articles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_saved (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, article_id)
      );
    `);

    console.log('✅ All tables created successfully.');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await pool.end();
  }
}

createTables();
