import { createServerClient } from '@/lib/supabase/server';
import { createCalendarEvent } from '@/lib/google/calendar';
import { placeBlandCall } from '@/lib/bland/client';
import { DEFAULT_FAMILY_ID } from '@/lib/types';

const familyId = () => process.env.NEXT_PUBLIC_FAMILY_ID ?? DEFAULT_FAMILY_ID;

export type ToolName =
  | 'update_shopping_list'
  | 'update_todos'
  | 'manage_calendar'
  | 'book_voice_appointment'
  | 'update_chore_points'
  | 'pin_family_note'
  | 'conversational_reply';

export async function executeTool(name: ToolName, args: Record<string, unknown>) {
  switch (name) {
    case 'update_shopping_list':
      return executeShopping(args);
    case 'update_todos':
      return executeTodos(args);
    case 'manage_calendar':
      return executeCalendar(args);
    case 'book_voice_appointment':
      return executeBland(args);
    case 'update_chore_points':
      return executeChores(args);
    case 'pin_family_note':
      return executeNote(args);
    case 'conversational_reply':
      return { success: true, message: String(args.reply ?? '') };
    default:
      return { success: false, message: 'Unknown tool' };
  }
}

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

async function executeShopping(args: Record<string, unknown>) {
  const supabase = createServerClient();
  if (!supabase) return { success: false, message: 'Database not configured' };
  const action = args.action as string;
  const items = (args.items as { name: string; quantity?: string }[]) ?? [];

  for (const item of items) {
    if (action === 'add') {
      await supabase.from('shopping_items').insert({
        family_id: familyId(),
        text: item.name,
        quantity: item.quantity ?? null,
      });
    } else {
      await supabase.from('shopping_items').delete().eq('family_id', familyId()).ilike('text', item.name);
    }
  }

  const { count } = await supabase
    .from('shopping_items')
    .select('*', { count: 'exact', head: true })
    .eq('family_id', familyId())
    .eq('done', false);

  return {
    success: true,
    message: `Updated shopping list`,
    listTotal: count,
    uiEvent: {
      type: 'confirm' as const,
      payload: {
        title: 'Shopping list updated',
        lines: [
          ['Added', items.map((i) => i.name).join(', ')],
          ['List total', `${count ?? 0} items`],
        ],
      },
    },
  };
}

async function executeTodos(args: Record<string, unknown>) {
  const supabase = createServerClient();
  if (!supabase) return { success: false, message: 'Database not configured' };
  const action = args.action as string;
  const text = args.text as string;
  const assignedTo = args.assignedTo as string | undefined;
  const memberId = await resolveMemberId(assignedTo);

  if (action === 'add') {
    await supabase.from('todos').insert({ family_id: familyId(), text, assigned_to: memberId });
  } else {
    await supabase.from('todos').update({ done: true }).eq('family_id', familyId()).ilike('text', `%${text}%`);
  }
  return { success: true, message: `Todo ${action}: ${text}` };
}

async function executeCalendar(args: Record<string, unknown>) {
  const supabase = createServerClient();
  if (!supabase) return { success: false, message: 'Database not configured' };
  const title = args.title as string;
  const start = args.start as string;
  const end = args.end as string | undefined;
  const location = args.location as string | undefined;
  const memberName = args.memberName as string | undefined;
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
    message: `Booked ${title}`,
    uiEvent: {
      type: 'confirm' as const,
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
}

async function executeBland(args: Record<string, unknown>) {
  const businessName = args.businessName as string;
  const phoneNumber = args.phoneNumber as string;
  const purpose = args.purpose as string;
  const preferredSlot = args.preferredSlot as string | undefined;
  const partySize = args.partySize as number | undefined;

  const task = [
    `Calling ${businessName} for the Mehta family.`,
    `Purpose: ${purpose}.`,
    preferredSlot ? `Preferred: ${preferredSlot}.` : '',
    partySize ? `Party of ${partySize}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const call = await placeBlandCall({ phoneNumber, task, metadata: { business: businessName } });

  return {
    success: true,
    message: `Voice booking with ${businessName}`,
    call,
    uiEvent: {
      type: 'action' as const,
      payload: {
        label: `Calling ${businessName} to book…`,
        done: call.ok ? `Booked — ${preferredSlot ?? 'confirmed'}` : 'Call placed',
      },
    },
  };
}

async function executeChores(args: Record<string, unknown>) {
  const supabase = createServerClient();
  if (!supabase) return { success: false, message: 'Database not configured' };
  const memberName = args.memberName as string;
  const starsToAdd = (args.starsToAdd as number) ?? 1;
  const pointsToAdd = (args.pointsToAdd as number) ?? 20;
  const memberId = await resolveMemberId(memberName);
  if (!memberId) return { success: false, message: 'Unknown member' };

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStr = weekStart.toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('chore_points')
    .select('stars, points')
    .eq('member_id', memberId)
    .eq('week_start', weekStr)
    .maybeSingle();

  await supabase.from('chore_points').upsert(
    {
      family_id: familyId(),
      member_id: memberId,
      week_start: weekStr,
      stars: (existing?.stars ?? 0) + starsToAdd,
      points: (existing?.points ?? 0) + pointsToAdd,
    },
    { onConflict: 'member_id,week_start' }
  );

  return { success: true, message: `Stars awarded to ${memberName}` };
}

async function executeNote(args: Record<string, unknown>) {
  const supabase = createServerClient();
  if (!supabase) return { success: false, message: 'Database not configured' };
  const fromMember = args.fromMember as string;
  const body = args.body as string;
  const memberId = await resolveMemberId(fromMember);

  await supabase.from('family_notes').insert({
    family_id: familyId(),
    from_member_id: memberId,
    body,
    pinned: true,
  });

  return { success: true, message: 'Note pinned' };
}
