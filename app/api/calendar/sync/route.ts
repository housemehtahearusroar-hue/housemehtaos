import { NextResponse } from 'next/server';
import { syncCalendarToSupabase } from '@/lib/google/calendar';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ synced: 0, mock: true, error: 'Supabase not configured' });
  }
  const result = await syncCalendarToSupabase(DEFAULT_FAMILY_ID, supabase);
  return NextResponse.json(result);
}
