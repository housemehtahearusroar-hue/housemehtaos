import { NextResponse } from 'next/server';
import { getCommuteAlert } from '@/lib/google/maps';
import { createServerClient } from '@/lib/supabase/server';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = process.env.COMMUTE_ORIGIN ?? 'home';
  const destination =
    process.env.COMMUTE_DESTINATION_ADDRESS ??
    process.env.COMMUTE_DESTINATION ??
    'Lincoln Elementary';

  const commute = await getCommuteAlert(origin, destination);

  if (!commute) {
    const supabase = createServerClient();
    const { data } = supabase ? await supabase
      .from('commute_alerts')
      .select('*')
      .eq('family_id', DEFAULT_FAMILY_ID)
      .limit(1)
      .maybeSingle() : { data: null };

    if (data) {
      const leaveBy = new Date(data.leave_by);
      return NextResponse.json({
        leaveBy: leaveBy.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        delayMinutes: data.delay_minutes,
        routeNote: data.route_note,
        destination: data.destination,
        mock: true,
      });
    }

    return NextResponse.json({
      leaveBy: '8:05 AM',
      delayMinutes: 6,
      routeNote: 'Route 9',
      destination: 'Lincoln Elementary',
      mock: true,
    });
  }

  const leaveBy = new Date(commute.leaveBy);
  return NextResponse.json({
    leaveBy: leaveBy.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    delayMinutes: commute.delayMinutes,
    routeNote: commute.routeNote,
    destination,
  });
}
