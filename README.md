# News Recommendation System

A personalized news aggregation platform using **pgvector in Neon PostgreSQL** for semantic content recommendations. The system leverages vector embeddings to deliver intelligent, personalized news feeds based on user reading patterns.

## 🌟 Features

- 📰 **News Aggregation**: Automatically fetches top stories from HackerNews
- 🔍 **Semantic Search**: Uses vector embeddings for content similarity
- 👤 **Personalized Recommendations**: AI-powered suggestions based on reading history
- 📊 **User Engagement Tracking**: Records interactions to improve recommendations
- 🔗 **Related Articles**: Finds similar content using vector similarity
- 🔐 **JWT Authentication**: Secure user sessions and data protection
- ⏰ **Automated Updates**: Scheduled content fetching every 30 minutes

## 🛠️ Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: Neon PostgreSQL with pgvector extension
- **Embeddings**: Hugging Face Transformers (all-MiniLM-L6-v2)
- **Authentication**: JWT tokens with bcrypt
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Deployment**: Docker & Docker Compose
- **Scheduling**: Node-cron for automated tasks

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express API    │    │ Neon PostgreSQL │
│   (HTML/CSS/JS) │◄──►│   Server         │◄──►│ with pgvector   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Hugging Face API │
                       │ (Embeddings)     │
                       └──────────────────┘
```

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Neon PostgreSQL account

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd news-recommendation-system
```

### 2. Environment Configuration
Create a `.env` file with your credentials:
```env
PORT=3000
DATABASE_URL=your_neon_postgresql_connection_string
HACKERNEWS_API_BASE=https://hacker-news.firebaseio.com/v0
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_huggingface_api_key
USE_OPENAI=false
JWT_SECRET=your_secure_jwt_secret
```

### 3. Build and Run
```bash
# Build the Docker image
docker build -t news-recommendation-app .

# Start the application
docker-compose up -d

# Check if running
docker ps
```

### 4. Access Your App
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api/news/topstories
- **Fetch News**: http://localhost:3000/api/news/fetch

## 🔧 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL with pgvector

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
# or
node server.js
```

## 📊 Database Schema

### Core Tables
```sql
-- Articles with vector embeddings
CREATE TABLE articles (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    score INTEGER DEFAULT 0,
    author TEXT,
    time BIGINT,
    descendants INTEGER DEFAULT 0,
    type TEXT,
    content TEXT,
    source TEXT,
    category TEXT,
    tags TEXT[],
    relevance_score FLOAT DEFAULT 0.0,
    published_at TIMESTAMP,
    keywords TEXT[],
    embedding vector(384), -- pgvector for similarity search
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User authentication and preferences
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User interactions for personalization
CREATE TABLE user_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    article_id BIGINT REFERENCES articles(id),
    interaction_type VARCHAR(50), -- 'like', 'dislike', 'read', 'bookmark', 'view'
    interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id, interaction_type)
);
```

## 🔗 API Endpoints

### News Endpoints
```
GET  /api/news/topstories          # Top rated articles
GET  /api/news/latest              # Recently published articles  
GET  /api/news/beststories         # Best articles by relevance
GET  /api/news/fetch               # Fetch new articles from sources
GET  /api/news/related/:articleId  # Find similar articles
```

### User Endpoints (Authentication Required)
```
GET  /api/news/recommendations/:userId     # Personalized recommendations
GET  /api/news/saved/:userId              # User's saved articles
GET  /api/news/recommend/semantic/:userId # Semantic recommendations
POST /api/news/interaction                # Record user interaction
```

### Authentication Endpoints
```
POST /api/users/register          # Create new account
POST /api/users/login             # User authentication
GET  /api/users/profile/:userId   # Get user profile
PUT  /api/users/preferences/:userId # Update user preferences
```

## 🤖 How Recommendations Work

### 1. Content Embedding
```javascript
// Articles are converted to 384-dimensional vectors
const embedding = await generateEmbedding(`${article.title} ${article.content}`);
```

### 2. User Profile Building
```sql
-- Average user's reading history embeddings
SELECT AVG(a.embedding) as user_profile_vector
FROM user_reading_history r
JOIN articles a ON r.article_id = a.id
WHERE r.user_id = $1
```

### 3. Similarity Search
```sql
-- Find similar articles using vector distance
SELECT * FROM articles
WHERE embedding IS NOT NULL
ORDER BY embedding <#> $user_profile_vector
LIMIT 10;
```

## 🐳 Docker Configuration

### Dockerfile
- Uses Node.js 18 Alpine for small footprint
- Multi-stage build for production optimization
- Health checks for container monitoring
- Non-root user for security

### Docker Compose
- Automated service orchestration
- Environment variable management
- Health monitoring and restart policies

## 📈 Performance Optimization

- **Vector Indexing**: pgvector HNSW indexes for fast similarity search
- **Connection Pooling**: PostgreSQL connection optimization
- **Caching**: In-memory caching for frequently accessed data
- **Batch Processing**: Efficient bulk operations for embeddings

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Sanitized user inputs
- **CORS Configuration**: Proper cross-origin resource sharing
- **Environment Variables**: Sensitive data protection



##  Acknowledgments

- [Neon](https://neon.tech/) for managed PostgreSQL with pgvector
- [Hugging Face](https://huggingface.co/) for embedding models
- [HackerNews API](https://github.com/HackerNews/API) for news content
- [pgvector](https://github.com/pgvector/pgvector) for vector similarity search

