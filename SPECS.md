# News Recommendation System - Technical Specifications

## Overview

The News Recommendation System is a personalized content delivery platform that leverages **pgvector in Neon PostgreSQL** to store article embeddings and provide intelligent news recommendations. The system uses **vector similarity search** to match content with user preferences based on semantic understanding and reading history patterns.

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser (Frontend)                                         │
│  - HTML/CSS/JavaScript                                          │
│  - Responsive Design                                             │
│  - Real-time Updates                                             │
└─────────────────────────────────────────────────────────────────┘
                               │ HTTP/HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Express.js API Server                                          │
│  ├── Authentication Middleware (JWT)                            │
│  ├── News Routes (/api/news/*)                                  │
│  ├── User Routes (/api/users/*)                                 │
│  ├── Rate Limiting & CORS                                       │
│  └── Error Handling                                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ├── Embedding Service (Hugging Face API)                       │
│  ├── News Aggregation Service (HackerNews API)                  │
│  ├── Recommendation Engine                                      │
│  ├── User Interaction Tracking                                  │
│  └── Automated Scheduling (node-cron)                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  Neon PostgreSQL with pgvector Extension                        │
│  ├── Articles Table (with 384-dim embeddings)                   │
│  ├── Users Table (authentication & preferences)                 │
│  ├── User Interactions Table (engagement tracking)              │
│  ├── Vector Similarity Indexes (HNSW)                           │
│  └── Connection Pooling                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Functional Requirements

### F1. User Management
- **F1.1** Users can register with email/username and password
- **F1.2** Users can authenticate using JWT tokens
- **F1.3** Users can update their reading preferences
- **F1.4** System maintains user reading history and interactions
- **F1.5** Users can save/bookmark articles for later reading

### F2. Content Aggregation
- **F2.1** System automatically fetches articles from HackerNews API
- **F2.2** Articles are processed and stored with metadata
- **F2.3** Content is converted to 384-dimensional vector embeddings
- **F2.4** System updates content every 30 minutes via scheduled jobs
- **F2.5** Duplicate articles are handled with conflict resolution

### F3. Recommendation Engine
- **F3.1** Generate personalized feeds based on user reading history
- **F3.2** Provide semantic similarity recommendations using vector search
- **F3.3** Recommend articles based on user preferences and keywords
- **F3.4** Find related articles for currently viewed content
- **F3.5** Continuously improve recommendations based on user interactions

### F4. Content Discovery
- **F4.1** Browse top-rated articles across all sources
- **F4.2** View latest articles chronologically
- **F4.3** Access curated "best stories" by relevance score
- **F4.4** Search for similar content using vector similarity
- **F4.5** Filter content by source, category, or publication date

### F5. User Interaction Tracking
- **F5.1** Record article views, likes, dislikes, and bookmarks
- **F5.2** Track reading time and engagement patterns
- **F5.3** Build user preference profiles from interaction data
- **F5.4** Use interaction data to improve future recommendations
- **F5.5** Provide analytics on user reading behavior

## Non-Functional Requirements

### Performance Requirements
- **P1** API response time < 200ms for most endpoints
- **P2** Vector similarity search < 100ms for up to 1M articles
- **P3** Support concurrent users with minimal latency impact
- **P4** Database queries optimized with proper indexing
- **P5** Embedding generation < 5 seconds per article

### Scalability Requirements
- **S1** Handle 100,000+ articles in the database
- **S2** Support 1,000+ concurrent users
- **S3** Process 1,000+ new articles per day
- **S4** Scale horizontally with container orchestration
- **S5** Database connection pooling for efficient resource usage

### Security Requirements
- **SE1** JWT-based authentication with secure token handling
- **SE2** Password hashing using bcrypt with salt rounds
- **SE3** Input validation and sanitization for all endpoints
- **SE4** CORS configuration for secure cross-origin requests
- **SE5** Environment variable protection for sensitive data

### Reliability Requirements
- **R1** 99.9% uptime availability
- **R2** Graceful error handling and recovery
- **R3** Health checks for container monitoring
- **R4** Database backup and recovery procedures
- **R5** Automated restart policies for failed services

### Usability Requirements
- **U1** Intuitive web interface requiring minimal training
- **U2** Responsive design for mobile and desktop devices
- **U3** Fast loading times for optimal user experience
- **U4** Clear visual feedback for user actions
- **U5** Accessible design following WCAG guidelines

## Technical Specifications

### Database Schema

#### Articles Table
```sql
CREATE TABLE articles (
    id BIGINT PRIMARY KEY,                    -- HackerNews article ID
    title TEXT NOT NULL,                      -- Article headline
    url TEXT,                                 -- Original article URL
    score INTEGER DEFAULT 0,                  -- HackerNews score
    author TEXT,                              -- Article author
    time BIGINT,                              -- Unix timestamp
    descendants INTEGER DEFAULT 0,            -- Number of comments
    type TEXT,                                -- Content type (story, comment, etc.)
    content TEXT,                             -- Article text content
    source TEXT,                              -- Content source identifier
    category TEXT,                            -- Article category
    tags TEXT[],                              -- Associated tags
    relevance_score FLOAT DEFAULT 0.0,       -- Internal relevance scoring
    published_at TIMESTAMP,                  -- Publication timestamp
    keywords TEXT[],                          -- Extracted keywords
    embedding vector(384),                   -- pgvector embedding (384-dim)
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_articles_score ON articles(score DESC),
    INDEX idx_articles_published ON articles(published_at DESC),
    INDEX idx_articles_source ON articles(source),
    INDEX idx_articles_embedding_hnsw ON articles USING hnsw (embedding vector_cosine_ops)
);
```

#### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,     -- bcrypt hashed password
    preferences JSONB,                       -- User preferences and settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_users_username ON users(username),
    INDEX idx_users_email ON users(email)
);
```

#### User Interactions Table
```sql
CREATE TABLE user_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,   -- 'like', 'dislike', 'read', 'bookmark', 'view'
    interaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,                          -- Additional interaction data
    
    -- Unique constraint to prevent duplicate interactions
    UNIQUE(user_id, article_id, interaction_type),
    
    -- Indexes
    INDEX idx_interactions_user ON user_interactions(user_id),
    INDEX idx_interactions_article ON user_interactions(article_id),
    INDEX idx_interactions_type ON user_interactions(interaction_type),
    INDEX idx_interactions_time ON user_interactions(interaction_time)
);
```

#### Supporting Tables
```sql
-- User saved articles for quick access
CREATE TABLE user_saved (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, article_id)
);

-- User reading history for recommendations
CREATE TABLE user_reading_history (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id BIGINT REFERENCES articles(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reading_time INTEGER DEFAULT 0,          -- Time spent reading (seconds)
    PRIMARY KEY (user_id, article_id)
);
```

### API Specification

#### Authentication Endpoints
```yaml
POST /api/users/register:
  summary: Register new user account
  request:
    body:
      username: string (required)
      email: string (required, valid email)
      password: string (required, min 8 chars)
  response:
    success: { user: UserObject, token: string }
    error: { error: string }

POST /api/users/login:
  summary: Authenticate user
  request:
    body:
      username: string (required)
      password: string (required)
  response:
    success: { user: UserObject, token: string }
    error: { error: string }

GET /api/users/profile/:userId:
  summary: Get user profile
  headers:
    Authorization: Bearer <jwt_token>
  response:
    success: { user: UserObject }
    error: { error: string }
```

#### News Content Endpoints
```yaml
GET /api/news/topstories:
  summary: Get top-rated articles
  parameters:
    limit: integer (optional, default 30)
  response:
    success: Article[]
    error: { error: string }

GET /api/news/latest:
  summary: Get recently published articles
  parameters:
    limit: integer (optional, default 20)
  response:
    success: Article[]

GET /api/news/beststories:
  summary: Get best articles by relevance
  parameters:
    limit: integer (optional, default 20)
  response:
    success: Article[]

GET /api/news/fetch:
  summary: Manually fetch new articles from sources
  response:
    success: Article[]
    error: { error: string }

GET /api/news/related/:articleId:
  summary: Find similar articles using vector similarity
  parameters:
    articleId: integer (required)
    limit: integer (optional, default 5)
  response:
    success: Article[]
```

#### Personalization Endpoints (Authenticated)
```yaml
GET /api/news/recommendations/:userId:
  summary: Get personalized recommendations
  headers:
    Authorization: Bearer <jwt_token>
  parameters:
    userId: integer (required)
    limit: integer (optional, default 20)
  response:
    success: Article[]

GET /api/news/recommend/semantic/:userId:
  summary: Get semantic recommendations based on reading history
  headers:
    Authorization: Bearer <jwt_token>
  parameters:
    userId: integer (required)
    limit: integer (optional, default 10)
  response:
    success: Article[]

GET /api/news/saved/:userId:
  summary: Get user's saved articles
  headers:
    Authorization: Bearer <jwt_token>
  response:
    success: Article[]

POST /api/news/interaction:
  summary: Record user interaction with article
  headers:
    Authorization: Bearer <jwt_token>
  request:
    body:
      userId: integer (required)
      articleId: integer (required)
      interactionType: string (required: 'like'|'dislike'|'read'|'bookmark'|'view')
  response:
    success: { success: boolean }
```

### Vector Embedding Specification

#### Embedding Model
- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Dimensions**: 384
- **Provider**: Hugging Face Inference API
- **Input**: Article title + content (truncated to model limits)
- **Output**: Normalized vector representation

#### Similarity Calculations
```sql
-- Cosine similarity for article recommendations
SELECT *, (embedding <#> $user_vector) as similarity_score
FROM articles 
WHERE embedding IS NOT NULL
ORDER BY similarity_score ASC
LIMIT 10;

-- Euclidean distance for related articles
SELECT *, (embedding <-> $article_vector) as distance
FROM articles 
WHERE id != $current_article_id 
AND embedding IS NOT NULL
ORDER BY distance ASC
LIMIT 5;
```

### Deployment Architecture

#### Docker Configuration
```yaml
# docker-compose.yml structure
services:
  news-app:
    build: .
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/api/news/topstories"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Environment Variables
```env
# Required Configuration
PORT=3000
DATABASE_URL=postgresql://user:pass@host:port/dbname?sslmode=require
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
JWT_SECRET=secure_random_string_for_jwt_signing

# API Configuration
HACKERNEWS_API_BASE=https://hacker-news.firebaseio.com/v0
EMBEDDING_PROVIDER=huggingface
USE_OPENAI=false

# Optional Configuration
NODE_ENV=production
LOG_LEVEL=info
MAX_ARTICLES_PER_FETCH=30
RECOMMENDATION_LIMIT=20
```

## Performance Optimization

### Database Optimization
- **Indexing Strategy**: HNSW indexes for vector similarity search
- **Connection Pooling**: pg pool for efficient database connections
- **Query Optimization**: Prepared statements and efficient joins
- **Batch Operations**: Bulk inserts for article processing

### Application Optimization
- **Caching**: In-memory caching for frequently accessed data
- **Asynchronous Processing**: Non-blocking I/O for API calls
- **Rate Limiting**: Protection against API abuse
- **Compression**: Gzip compression for API responses

### Vector Search Optimization
```sql
-- Create optimized HNSW index for fast similarity search
CREATE INDEX ON articles USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Optimize for different similarity metrics
CREATE INDEX ON articles USING hnsw (embedding vector_l2_ops);    -- L2 distance
CREATE INDEX ON articles USING hnsw (embedding vector_ip_ops);    -- Inner product
```

## Monitoring and Logging

### Health Checks
- **Application Health**: HTTP endpoint monitoring
- **Database Health**: Connection and query performance
- **External API Health**: Embedding service availability
- **Container Health**: Docker health check configuration

### Logging Strategy
- **Application Logs**: Structured JSON logging with Winston
- **Database Logs**: Query performance and error tracking
- **API Logs**: Request/response logging with correlation IDs
- **Error Tracking**: Comprehensive error logging and alerting

## Security Considerations

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Token expiration and refresh logic
- **Access Control**: Role-based permissions (future enhancement)

### Data Protection
- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization
- **CORS Configuration**: Restricted cross-origin access

### Infrastructure Security
- **Environment Variables**: Secure configuration management
- **Container Security**: Non-root user execution
- **Network Security**: Restricted port exposure
- **API Rate Limiting**: Protection against abuse

## Future Enhancements

### Short-term (1-3 months)
- **Multiple News Sources**: Reddit, RSS feeds, news APIs
- **Advanced Filtering**: Date ranges, categories, sources
- **User Interface Improvements**: Better UX/UI design
- **Mobile App**: React Native mobile application

### Medium-term (3-6 months)
- **Machine Learning**: Custom recommendation models
- **Real-time Updates**: WebSocket connections for live updates
- **Social Features**: User comments and sharing
- **Analytics Dashboard**: User behavior and system metrics

### Long-term (6+ months)
- **Multi-language Support**: Internationalization
- **Advanced NLP**: Topic modeling and sentiment analysis
- **Federated Learning**: Privacy-preserving recommendation training
- **Enterprise Features**: Team accounts and organization management

## Testing Strategy

### Unit Testing
- **Backend Logic**: Express route handlers and services
- **Database Operations**: CRUD operations and queries
- **Authentication**: JWT token validation and user management
- **Embedding Service**: Vector generation and similarity calculations

### Integration Testing
- **API Endpoints**: Full request/response cycle testing
- **Database Integration**: Schema validation and data integrity
- **External APIs**: HackerNews and Hugging Face integration
- **Docker Environment**: Container and service integration

### Performance Testing
- **Load Testing**: Concurrent user simulation
- **Database Performance**: Query execution time analysis
- **Vector Search Performance**: Similarity search benchmarks
- **API Response Times**: Endpoint performance measurement

---

This specification provides a comprehensive technical foundation for the News Recommendation System, ensuring scalable, secure, and performant implementation using modern web technologies and vector similarity search capabilities.