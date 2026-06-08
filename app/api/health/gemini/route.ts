import { generateGeminiText, isGeminiKeyConfigured, GEMINI_CHAT_MODEL } from '@/lib/ai/gemini-rest';

export const dynamic = 'force-dynamic';

export async function GET() {
  const keyConfigured = isGeminiKeyConfigured();

  if (!keyConfigured) {
    return Response.json({
      ok: false,
      model: GEMINI_CHAT_MODEL,
      keyConfigured: false,
      error: 'GOOGLE_GENERATIVE_AI_API_KEY is not set in Vercel environment variables',
    });
  }

  try {
    const text = await generateGeminiText('Reply in one word.', 'Say hello');
    return Response.json({
      ok: true,
      model: GEMINI_CHAT_MODEL,
      keyConfigured: true,
      sample: text,
    });
  } catch (err) {
    return Response.json({
      ok: false,
      model: GEMINI_CHAT_MODEL,
      keyConfigured: true,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
