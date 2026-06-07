import { streamText, stepCountIs } from 'ai';
import { chatModel } from '@/lib/ai/gemini';
import { buildRouterSystemPrompt } from '@/lib/ai/prompts';
import { retrieveMemoryContext, extractAndSaveMemory } from '@/lib/ai/memory';
import { auraTools } from '@/lib/ai/tools';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { messages, familyId = DEFAULT_FAMILY_ID } = await req.json();
  const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === 'user') as
    | { role: string; content?: string; parts?: { type: string; text?: string }[] }
    | undefined;
  const userPrompt =
    lastUser?.content ??
    lastUser?.parts
      ?.filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('') ??
    '';

  // Memory retrieval gate — must complete before Gemini
  const dossier = await retrieveMemoryContext(userPrompt, familyId);
  const system = buildRouterSystemPrompt(dossier);

  const result = streamText({
    model: chatModel,
    system,
    messages,
    tools: auraTools,
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, steps }) => {
      const toolResults = steps
        .flatMap((s) => s.toolResults ?? [])
        .map((r) => JSON.stringify(r))
        .join('\n');

      const supabase = createServerClient();
      if (supabase) {
        await supabase.from('aura_messages').insert([
          { family_id: familyId, role: 'user', content: userPrompt },
          { family_id: familyId, role: 'assistant', content: text, metadata: { toolResults } },
        ]);
      }

      extractAndSaveMemory(userPrompt, text, toolResults, familyId).catch(console.error);
    },
  });

  return result.toUIMessageStreamResponse();
}
