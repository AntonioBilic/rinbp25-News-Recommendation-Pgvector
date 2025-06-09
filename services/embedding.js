import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  Missing OPENAI_API_KEY in environment');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text) {
  if (!text) return null;

  try {
    const res = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.trim().toLowerCase(), // optional normalization
    });
    return res.data[0].embedding;
  } catch (err) {
    console.error('❌ Embedding error:', err.message || err);
    return null;
  }
}
