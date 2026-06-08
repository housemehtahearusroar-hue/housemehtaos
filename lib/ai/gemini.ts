import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const chatModel = google('gemini-2.5-flash');
export const embedModel = google.textEmbeddingModel('text-embedding-004');
