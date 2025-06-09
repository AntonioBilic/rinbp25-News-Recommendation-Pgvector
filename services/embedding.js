// services/embedding.js - Cloud-based version (No local dependencies!)
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

if (!HUGGINGFACE_API_KEY) {
  console.warn('⚠️  Missing HUGGINGFACE_API_KEY in environment');
}

export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    console.log('⚠️  No text provided for embedding');
    return null;
  }

  const cleanText = text.trim().toLowerCase();
  if (cleanText.length === 0) {
    console.log('⚠️  Empty text provided for embedding');
    return null;
  }

  try {
    console.log(`🔄 Generating embedding for: "${cleanText.substring(0, 50)}..."`);
    
    const response = await axios.post(
      HUGGINGFACE_URL,
      { inputs: cleanText },
      { 
        headers: { 
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 
      }
    );

    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Generated embedding with ${response.data.length} dimensions`);
      return response.data;
    }
    
    console.error('❌ Invalid response format from Hugging Face');
    return null;
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Invalid Hugging Face API key');
    } else if (error.response?.status === 429) {
      console.error('❌ Rate limit exceeded - try again later');
    } else if (error.response?.data?.error) {
      console.error('❌ Hugging Face error:', error.response.data.error);
    } else {
      console.error('❌ Embedding error:', error.message);
    }
    return null;
  }
}

// Health check function
export async function checkEmbeddingHealth() {
  try {
    const testEmbedding = await generateEmbedding("test");
    return {
      status: 'healthy',
      service: 'huggingface',
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      working: testEmbedding !== null
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      service: 'huggingface'
    };
  }
}