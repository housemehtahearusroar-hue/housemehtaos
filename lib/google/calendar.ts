import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';

export function isCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() &&
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim()
  );
}

function getOAuthClient() {
  if (!isCalendarConfigured()) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN });
  return oauth2;
}

function eventStartIso(ev: calendar_v3.Schema$Event): string | null {
  if (ev.start?.dateTime) return ev.start.dateTime;
  if (ev.start?.date) return `${ev.start.date}T12:00:00.000Z`;
  return null;
}

function eventEndIso(ev: calendar_v3.Schema$Event): string | null {
  if (ev.end?.dateTime) return ev.end.dateTime;
  if (ev.end?.date) return `${ev.end.date}T12:00:00.000Z`;
  return null;
}

export async function probeCalendarConnection() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';

  if (!isCalendarConfigured()) {
    return {
      ok: false,
      configured: false,
      calendarId,
      error: 'Missing GOOGLE_CALENDAR_CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN',
    };
  }

  const auth = getOAuthClient()!;
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: weekLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10,
    });

    const events = res.data.items ?? [];
    return {
      ok: true,
      configured: true,
      calendarId,
      googleEventCount: events.length,
      sampleTitles: events.map((e) => e.summary).filter(Boolean).slice(0, 5),
      timeMin: now.toISOString(),
      timeMax: weekLater.toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      calendarId,
      error: err instanceof Error ? err.message : String(err),
    };
  }
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

async function saveSyncedEvent(
  supabase: SupabaseClient,
  familyId: string,
  row: {
    google_event_id: string;
    title: string;
    location: string | null;
    starts_at: string;
    ends_at: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: upsertError } = await supabase.from('calendar_events').upsert(
    { family_id: familyId, ...row },
    { onConflict: 'google_event_id' }
  );

  if (!upsertError) return { ok: true };

  // Fallback when 002 migration did not add UNIQUE (column already existed from 001)
  if (!upsertError.message.includes('ON CONFLICT')) {
    return { ok: false, error: upsertError.message };
  }

  const { data: existing } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('google_event_id', row.google_event_id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('calendar_events')
      .update({
        title: row.title,
        location: row.location,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
      })
      .eq('id', existing.id);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  const { error } = await supabase.from('calendar_events').insert({
    family_id: familyId,
    ...row,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function syncCalendarToSupabase(familyId: string, supabase: SupabaseClient) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';

  if (!isCalendarConfigured()) {
    return {
      synced: 0,
      configured: false,
      googleEventCount: 0,
      skipped: 0,
      error: 'Google Calendar env vars not set',
    };
  }

  const auth = getOAuthClient()!;
  const calendar = google.calendar({ version: 'v3', auth });
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: weekLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items ?? [];
    let synced = 0;
    let skipped = 0;

    for (const ev of events) {
      const startsAt = eventStartIso(ev);
      if (!ev.summary || !startsAt || !ev.id) {
        skipped++;
        continue;
      }

      const saved = await saveSyncedEvent(supabase, familyId, {
        google_event_id: ev.id,
        title: ev.summary,
        location: ev.location ?? null,
        starts_at: startsAt,
        ends_at: eventEndIso(ev),
      });

      if (!saved.ok) {
        return {
          synced,
          configured: true,
          googleEventCount: events.length,
          skipped,
          error: `Supabase save failed: ${saved.error}`,
        };
      }

      synced++;
    }

    // Remove demo seed events once real Google events are syncing
    if (synced > 0) {
      await supabase
        .from('calendar_events')
        .delete()
        .eq('family_id', familyId)
        .is('google_event_id', null);
    }

    return {
      synced,
      configured: true,
      googleEventCount: events.length,
      skipped,
      calendarId,
      timeMin: now.toISOString(),
      timeMax: weekLater.toISOString(),
      demoEventsCleared: synced > 0,
    };
  } catch (err) {
    return {
      synced: 0,
      configured: true,
      googleEventCount: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
