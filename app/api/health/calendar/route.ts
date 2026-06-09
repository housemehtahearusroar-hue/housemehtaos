import { isCalendarConfigured, probeCalendarConnection } from '@/lib/google/calendar';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerClient();
  const probe = await probeCalendarConnection();

  return Response.json({
    ...probe,
    env: {
      clientId: !!process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim(),
      clientSecret: !!process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim(),
      refreshToken: !!process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim(),
      calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
      configured: isCalendarConfigured(),
    },
    supabase: !!supabase,
  });
}
