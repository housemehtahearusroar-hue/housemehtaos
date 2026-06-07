import { tool } from 'ai';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createCalendarEvent } from '@/lib/google/calendar';
import { placeBlandCall } from '@/lib/bland/client';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

const familyId = () => process.env.NEXT_PUBLIC_FAMILY_ID ?? DEFAULT_FAMILY_ID;

async function resolveMemberId(name: string | undefined) {
  if (!name) return null;
  const supabase = createServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', familyId())
    .ilike('name', name)
    .maybeSingle();
  return data?.id ?? null;
}

export const auraTools = {
  update_shopping_list: tool({
    description: 'Add or remove items from the family shopping list',
    inputSchema: z.object({
      action: z.enum(['add', 'remove']),
      items: z.array(z.object({ name: z.string(), quantity: z.string().optional() })),
    }),
    execute: async ({ action, items }) => {
      const supabase = createServerClient();
      if (!supabase) return { success: false, message: 'Database not configured' };
      const results: string[] = [];

      for (const item of items) {
        if (action === 'add') {
          await supabase.from('shopping_items').insert({
            family_id: familyId(),
            text: item.name,
            quantity: item.quantity ?? null,
          });
          results.push(`Added ${item.name}`);
        } else {
          await supabase
            .from('shopping_items')
            .delete()
            .eq('family_id', familyId())
            .ilike('text', item.name);
          results.push(`Removed ${item.name}`);
        }
      }

      const { count } = await supabase
        .from('shopping_items')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', familyId())
        .eq('done', false);

      return {
        success: true,
        message: results.join(', '),
        listTotal: count ?? 0,
        uiEvent: {
          type: 'confirm',
          payload: {
            title: 'Shopping list updated',
            lines: [
              ['Added', items.map((i) => i.name).join(', ')],
              ['List total', `${count ?? 0} items`],
            ],
          },
        },
      };
    },
  }),

  update_todos: tool({
    description: 'Add, complete, or assign family to-dos',
    inputSchema: z.object({
      action: z.enum(['add', 'complete']),
      text: z.string(),
      assignedTo: z.string().optional(),
    }),
    execute: async ({ action, text, assignedTo }) => {
      const supabase = createServerClient();
      if (!supabase) return { success: false, message: 'Database not configured' };
      const memberId = await resolveMemberId(assignedTo);

      if (action === 'add') {
        await supabase.from('todos').insert({
          family_id: familyId(),
          text,
          assigned_to: memberId,
        });
        return { success: true, message: `Added todo: ${text}` };
      }

      await supabase
        .from('todos')
        .update({ done: true })
        .eq('family_id', familyId())
        .ilike('text', `%${text}%`);

      return { success: true, message: `Completed: ${text}` };
    },
  }),

  manage_calendar: tool({
    description: 'Create or update a family calendar event via Google Calendar',
    inputSchema: z.object({
      title: z.string(),
      start: z.string().describe('ISO datetime'),
      end: z.string().optional(),
      location: z.string().optional(),
      memberName: z.string().optional(),
    }),
    execute: async ({ title, start, end, location, memberName }) => {
      const supabase = createServerClient();
      if (!supabase) return { success: false, message: 'Database not configured' };
      const memberId = await resolveMemberId(memberName);
      const gcal = await createCalendarEvent({ title, start, end, location });

      await supabase.from('calendar_events').insert({
        family_id: familyId(),
        member_id: memberId,
        title,
        location: location ?? null,
        starts_at: start,
        ends_at: end ?? null,
        google_event_id: gcal.ok ? (gcal as { eventId?: string }).eventId : null,
      });

      return {
        success: true,
        message: `Calendar event created: ${title}`,
        googleCalendar: gcal,
        uiEvent: {
          type: 'confirm',
          payload: {
            title: 'Appointment booked',
            lines: [
              ['When', new Date(start).toLocaleString()],
              ['Who', memberName ?? 'Family'],
              ['Added to', 'Family calendar'],
            ],
          },
        },
      };
    },
  }),

  book_voice_appointment: tool({
    description: 'Place an automated phone call via Bland.ai to book appointments or reservations',
    inputSchema: z.object({
      businessName: z.string(),
      phoneNumber: z.string(),
      purpose: z.string(),
      preferredSlot: z.string().optional(),
      partySize: z.number().optional(),
    }),
    execute: async ({ businessName, phoneNumber, purpose, preferredSlot, partySize }) => {
      const task = [
        `You are calling ${businessName} on behalf of the Mehta family.`,
        `Purpose: ${purpose}.`,
        preferredSlot ? `Preferred time: ${preferredSlot}.` : '',
        partySize ? `Party size: ${partySize}.` : '',
        'Be polite, confirm the booking, and get a confirmation number.',
      ]
        .filter(Boolean)
        .join(' ');

      const call = await placeBlandCall({
        phoneNumber,
        task,
        metadata: { business: businessName, purpose },
      });

      return {
        success: true,
        message: call.mock
          ? `Simulated call to ${businessName}`
          : `Calling ${businessName}…`,
        call,
        uiEvent: {
          type: 'action',
          payload: {
            label: `Calling ${businessName} to book…`,
            done: call.ok ? `Booked — ${preferredSlot ?? 'confirmed'}` : 'Call initiated',
          },
        },
      };
    },
  }),

  update_chore_points: tool({
    description: 'Award stars/points to a child on the chore chart',
    inputSchema: z.object({
      memberName: z.string(),
      starsToAdd: z.number().default(1),
      pointsToAdd: z.number().default(20),
    }),
    execute: async ({ memberName, starsToAdd, pointsToAdd }) => {
      const supabase = createServerClient();
      if (!supabase) return { success: false, message: 'Database not configured' };
      const memberId = await resolveMemberId(memberName);
      if (!memberId) return { success: false, message: `Unknown member: ${memberName}` };

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStr = weekStart.toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('chore_points')
        .select('stars, points')
        .eq('member_id', memberId)
        .eq('week_start', weekStr)
        .maybeSingle();

      const stars = (existing?.stars ?? 0) + starsToAdd;
      const points = (existing?.points ?? 0) + pointsToAdd;

      await supabase.from('chore_points').upsert(
        {
          family_id: familyId(),
          member_id: memberId,
          week_start: weekStr,
          stars,
          points,
        },
        { onConflict: 'member_id,week_start' }
      );

      return { success: true, message: `Awarded ${starsToAdd} star(s) to ${memberName}` };
    },
  }),

  pin_family_note: tool({
    description: 'Pin a message on the family notes board',
    inputSchema: z.object({
      fromMember: z.string(),
      body: z.string(),
    }),
    execute: async ({ fromMember, body }) => {
      const supabase = createServerClient();
      if (!supabase) return { success: false, message: 'Database not configured' };
      const memberId = await resolveMemberId(fromMember);

      await supabase.from('family_notes').insert({
        family_id: familyId(),
        from_member_id: memberId,
        body,
        pinned: true,
      });

      return { success: true, message: 'Note pinned' };
    },
  }),

  conversational_reply: tool({
    description: 'Fallback when no other tool applies — brief conversational response',
    inputSchema: z.object({
      reply: z.string(),
    }),
    execute: async ({ reply }) => ({ success: true, message: reply }),
  }),
};
