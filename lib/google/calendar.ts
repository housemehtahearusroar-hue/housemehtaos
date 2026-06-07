import { google } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

export async function createCalendarEvent(params: {
  title: string;
  start: string;
  end?: string;
  location?: string;
  description?: string;
}) {
  const auth = getOAuthClient();
  if (!auth) {
    return { ok: false, error: 'Google Calendar not configured', mock: true, ...params };
  }

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';

  const start = new Date(params.start);
  const end = params.end ? new Date(params.end) : new Date(start.getTime() + 60 * 60 * 1000);

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: params.title,
      location: params.location,
      description: params.description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  return { ok: true, eventId: res.data.id, htmlLink: res.data.htmlLink };
}

export async function syncCalendarToSupabase(familyId: string, supabase: SupabaseClient) {
  const auth = getOAuthClient();
  if (!auth) return { synced: 0 };

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: weekLater.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items ?? [];
  let synced = 0;

  for (const ev of events) {
    if (!ev.summary || !ev.start?.dateTime) continue;
    await supabase.from('calendar_events').upsert(
      {
        family_id: familyId,
        google_event_id: ev.id,
        title: ev.summary,
        location: ev.location ?? null,
        starts_at: ev.start.dateTime,
        ends_at: ev.end?.dateTime ?? null,
      },
      { onConflict: 'google_event_id' }
    );
    synced++;
  }

  return { synced };
}
