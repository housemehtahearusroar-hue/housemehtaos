import { NextResponse } from 'next/server';
import { retrieveMemoryContext } from '@/lib/ai/memory';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

export async function POST(req: Request) {
  const { prompt, familyId = DEFAULT_FAMILY_ID } = await req.json();
  const dossier = await retrieveMemoryContext(prompt, familyId);
  return NextResponse.json({ dossier });
}
