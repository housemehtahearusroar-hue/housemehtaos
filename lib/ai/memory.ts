import { embed } from 'ai';
import { embedModel } from './gemini';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_FAMILY_ID } from '@/lib/types';
import type { MemoryEdge, MemoryNode } from '@/lib/types';

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embedModel,
    value: text,
  });
  return embedding;
}

export async function retrieveMemoryContext(
  prompt: string,
  familyId: string = DEFAULT_FAMILY_ID
): Promise<string> {
  const supabase = createServerClient();
  if (!supabase) return '';

  let embedding: number[];
  try {
    embedding = await embedText(prompt);
  } catch {
    return '';
  }

  const { data: nodes, error } = await supabase.rpc('match_memory_nodes', {
    query_embedding: embedding,
    match_family_id: familyId,
    match_count: 5,
  });

  if (error || !nodes?.length) {
    const { data: fallback } = await supabase
      .from('memory_nodes')
      .select('id, type, label, content')
      .eq('family_id', familyId)
      .limit(5);

    if (!fallback?.length) return '';
    return formatDossier(fallback as MemoryNode[], []);
  }

  const nodeIds = (nodes as MemoryNode[]).map((n) => n.id);
  const { data: edges } = await supabase
    .from('memory_edges')
    .select('id, source_id, target_id, relationship, weight')
    .eq('family_id', familyId)
    .or(`source_id.in.(${nodeIds.join(',')}),target_id.in.(${nodeIds.join(',')})`);

  return formatDossier(nodes as MemoryNode[], (edges ?? []) as MemoryEdge[]);
}

function formatDossier(nodes: MemoryNode[], edges: MemoryEdge[]): string {
  const lines: string[] = nodes.map((n) => `- [${n.type}] ${n.label}: ${n.content}`);
  for (const e of edges) {
    const src = nodes.find((n) => n.id === e.source_id);
    const tgt = nodes.find((n) => n.id === e.target_id);
    if (src && tgt) {
      lines.push(`- ${src.label} ${e.relationship} ${tgt.label} (weight ${e.weight})`);
    }
  }
  return lines.join('\n');
}

export async function extractAndSaveMemory(
  userPrompt: string,
  assistantReply: string,
  toolResults: string,
  familyId: string = DEFAULT_FAMILY_ID
): Promise<void> {
  const supabase = createServerClient();
  if (!supabase) return;
  const combined = `${userPrompt}\n${assistantReply}\n${toolResults}`;

  const facts = inferFacts(combined);
  if (!facts.length) return;

  for (const fact of facts) {
    const embedding = await embedText(fact.content);
    const { data: existing } = await supabase
      .from('memory_nodes')
      .select('id')
      .eq('family_id', familyId)
      .eq('label', fact.label)
      .maybeSingle();

    let nodeId = existing?.id;
    if (nodeId) {
      await supabase
        .from('memory_nodes')
        .update({ content: fact.content, embedding, updated_at: new Date().toISOString() })
        .eq('id', nodeId);
    } else {
      const { data: inserted } = await supabase
        .from('memory_nodes')
        .insert({
          family_id: familyId,
          type: fact.type,
          label: fact.label,
          content: fact.content,
          embedding,
        })
        .select('id')
        .single();
      nodeId = inserted?.id;
    }

    if (!nodeId) continue;

    for (const rel of fact.relationships) {
      const { data: target } = await supabase
        .from('memory_nodes')
        .select('id')
        .eq('family_id', familyId)
        .eq('label', rel.targetLabel)
        .maybeSingle();

      if (!target?.id) continue;

      const { data: edge } = await supabase
        .from('memory_edges')
        .select('id, weight')
        .eq('source_id', nodeId)
        .eq('target_id', target.id)
        .eq('relationship', rel.relationship)
        .maybeSingle();

      if (edge) {
        await supabase
          .from('memory_edges')
          .update({ weight: (edge.weight ?? 1) + 1 })
          .eq('id', edge.id);
      } else {
        await supabase.from('memory_edges').insert({
          family_id: familyId,
          source_id: nodeId,
          target_id: target.id,
          relationship: rel.relationship,
        });
      }
    }
  }
}

interface InferredFact {
  type: string;
  label: string;
  content: string;
  relationships: { targetLabel: string; relationship: string }[];
}

function inferFacts(text: string): InferredFact[] {
  const facts: InferredFact[] = [];
  const lower = text.toLowerCase();

  if (lower.includes('maya') && (lower.includes('dentist') || lower.includes('dr. lin') || lower.includes('dr lin'))) {
    facts.push({
      type: 'person',
      label: 'Maya',
      content: 'Maya has dental appointments with Dr. Lin.',
      relationships: [{ targetLabel: 'Dr. Lin', relationship: 'HAS_APPOINTMENT' }],
    });
  }
  if (lower.includes('tavola')) {
    facts.push({
      type: 'preference',
      label: 'Tavola',
      content: 'Family enjoys dining at Tavola.',
      relationships: [],
    });
  }
  if (lower.includes('paper towel') || lower.includes('coffee') || lower.includes('bounty')) {
    facts.push({
      type: 'preference',
      label: 'Shopping brands',
      content: 'Family buys Bounty paper towels and dark roast coffee.',
      relationships: [],
    });
  }
  if (lower.includes('thursday') && lower.includes('maya')) {
    facts.push({
      type: 'preference',
      label: 'Maya',
      content: 'Maya prefers Thursday afternoon appointments.',
      relationships: [],
    });
  }

  return facts;
}
