import { generateText } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

  try {
    const { text } = await generateText({
      model: chatModel,
      system:
        'Write a one-sentence morning briefing for a family smart mirror. Be warm and concise. Highlight event count, key times, and any open todos. Use plain text, no markdown.',
      prompt: context,
    });

    return Response.json({
      briefing: text,
      eventCount,
      todoCount: todoCount ?? 0,
    });
  } catch {
    return Response.json({
      briefing: `Busy one today — ${eventCount} events on the calendar and ${todoCount ?? 0} open to-dos.`,
      eventCount,
      todoCount: todoCount ?? 0,
      mock: true,
    });
  }
}
