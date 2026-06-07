import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

export async function POST(req: Request) {
  const body = await req.json();
  const { call_id, status, transcript, metadata } = body;

  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ received: true, mock: true });
  await supabase.from('aura_messages').insert({
    family_id: DEFAULT_FAMILY_ID,
    role: 'system',
    content: `Bland.ai call ${call_id}: ${status}`,
    metadata: { transcript, ...metadata },
  });

  return NextResponse.json({ received: true });
}
