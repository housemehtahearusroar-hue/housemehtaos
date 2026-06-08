const GEMINI_MODEL = 'gemini-2.5-flash';

export function isGeminiKeyConfigured(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
}

/** Direct REST call — matches the curl flow that works on the free tier. */
export async function generateGeminiText(
  system: string,
  prompt: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message ?? res.statusText;
    throw new Error(`Gemini API ${res.status}: ${msg}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no text');
  }

  return text.trim();
}

export const GEMINI_CHAT_MODEL = GEMINI_MODEL;
