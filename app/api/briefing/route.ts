import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { generateGeminiText } from '@/lib/ai/gemini-rest';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT =
  'Write a one-sentence morning briefing for a family smart mirror. Be warm and concise. Highlight event count, key times, and any open todos. Use plain text, no markdown.';

export async function GET() {
  const supabase = createServerClient();
  if (!supabase) {
    return Response.json({
      briefing: 'Good morning, Mehta family — connect Supabase for your live briefing.',
      eventCount: 3,
      todoCount: 2,
      mock: true,
    });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [{ data: events }, { data: todos }, { count: todoCount }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('title, starts_at')
      .eq('family_id', DEFAULT_FAMILY_ID)
      .gte('starts_at', today.toISOString())
      .lt('starts_at', tomorrow.toISOString()),
    supabase
      .from('todos')
      .select('text')
      .eq('family_id', DEFAULT_FAMILY_ID)
      .eq('done', false)
      .limit(3),
    supabase
      .from('todos')
      .select('*', { count: 'exact', head: true })
      .eq('family_id', DEFAULT_FAMILY_ID)
      .eq('done', false),
  ]);

  const eventCount = events?.length ?? 0;
  const context = JSON.stringify({ events, openTodos: todos });

  let text: string | undefined;
  let geminiError: string | undefined;

  try {
    const result = await generateText({
      model: chatModel,
      system: SYSTEM_PROMPT,
      prompt: context,
    });
    text = result.text;
  } catch (sdkErr) {
    geminiError = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
    try {
      text = await generateGeminiText(SYSTEM_PROMPT, context);
    } catch (restErr) {
      geminiError = restErr instanceof Error ? restErr.message : String(restErr);
    }
  }

  if (text) {
    return Response.json({
      briefing: text,
      eventCount,
      todoCount: todoCount ?? 0,
    });
  }

  return Response.json({
    briefing: `Busy one today — ${eventCount} events on the calendar and ${todoCount ?? 0} open to-dos.`,
    eventCount,
    todoCount: todoCount ?? 0,
    mock: true,
    geminiError,
  });
}
