'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { DEFAULT_FAMILY_ID } from '@/lib/types';
import type {
  CalendarEvent,
  ChorePoint,
  CommuteAlert,
  FamilyNote,
  Meal,
  Package,
  ShoppingItem,
  SlideshowPhoto,
  Todo,
  UpcomingItem,
} from '@/lib/types';
import {
  MOCK_CHORES,
  MOCK_COMMUTE,
  MOCK_EVENTS,
  MOCK_MEAL,
  MOCK_NOTES,
  MOCK_PACKAGE,
  MOCK_PHOTOS,
  MOCK_SHOPPING,
  MOCK_TODOS,
  MOCK_UPCOMING,
} from '@/lib/data/mock';

function hasSupabase() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function useFamilyData() {
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [todos, setTodos] = useState<Todo[]>(MOCK_TODOS);
  const [shopping, setShopping] = useState<ShoppingItem[]>(MOCK_SHOPPING);
  const [chores, setChores] = useState<ChorePoint[]>(MOCK_CHORES);
  const [notes, setNotes] = useState<FamilyNote[]>(MOCK_NOTES);
  const [meal, setMeal] = useState<Meal | null>(MOCK_MEAL);
  const [pkg, setPkg] = useState<Package | null>(MOCK_PACKAGE);
  const [commute, setCommute] = useState<CommuteAlert | null>(MOCK_COMMUTE);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>(MOCK_UPCOMING);
  const [photos, setPhotos] = useState<SlideshowPhoto[]>(MOCK_PHOTOS);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!hasSupabase()) return;

    const supabase = createBrowserClient();
    const familyId = process.env.NEXT_PUBLIC_FAMILY_ID ?? DEFAULT_FAMILY_ID;

    async function load() {
      const [
        evRes,
        todoRes,
        shopRes,
        choreRes,
        noteRes,
        mealRes,
        pkgRes,
        commuteRes,
        upcomingRes,
        photoRes,
      ] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*, family_members(*)')
          .eq('family_id', familyId)
          .gte('starts_at', new Date().toISOString().split('T')[0])
          .order('starts_at'),
        supabase.from('todos').select('*, family_members(*)').eq('family_id', familyId).order('created_at'),
        supabase.from('shopping_items').select('*').eq('family_id', familyId).eq('done', false).order('created_at'),
        supabase
          .from('chore_points')
          .select('*, family_members(*)')
          .eq('family_id', familyId),
        supabase.from('family_notes').select('*, family_members(*)').eq('family_id', familyId).order('created_at', { ascending: false }),
        supabase.from('meals').select('*').eq('family_id', familyId).limit(1).maybeSingle(),
        supabase.from('packages').select('*').eq('family_id', familyId).limit(1).maybeSingle(),
        supabase.from('commute_alerts').select('*').eq('family_id', familyId).limit(1).maybeSingle(),
        supabase.from('upcoming_items').select('*').eq('family_id', familyId).order('sort_order'),
        supabase.from('slideshow_photos').select('*').eq('family_id', familyId).order('sort_order'),
      ]);

      if (evRes.data?.length) setEvents(evRes.data as CalendarEvent[]);
      if (todoRes.data?.length) setTodos(todoRes.data as Todo[]);
      if (shopRes.data?.length) setShopping(shopRes.data as ShoppingItem[]);
      if (choreRes.data?.length) setChores(choreRes.data as ChorePoint[]);
      if (noteRes.data?.length) setNotes(noteRes.data as FamilyNote[]);
      if (mealRes.data) setMeal(mealRes.data as Meal);
      if (pkgRes.data) setPkg(pkgRes.data as Package);
      if (commuteRes.data) setCommute(commuteRes.data as CommuteAlert);
      if (upcomingRes.data?.length) setUpcoming(upcomingRes.data as UpcomingItem[]);
      if (photoRes.data?.length) setPhotos(photoRes.data as SlideshowPhoto[]);
      setConnected(true);
    }

    load();

    const channel = supabase
      .channel('family-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
        supabase
          .from('todos')
          .select('*, family_members(*)')
          .eq('family_id', familyId)
          .then(({ data }) => data && setTodos(data as Todo[]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
        supabase
          .from('shopping_items')
          .select('*')
          .eq('family_id', familyId)
          .eq('done', false)
          .then(({ data }) => data && setShopping(data as ShoppingItem[]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_points' }, () => {
        supabase
          .from('chore_points')
          .select('*, family_members(*)')
          .eq('family_id', familyId)
          .then(({ data }) => data && setChores(data as ChorePoint[]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_notes' }, () => {
        supabase
          .from('family_notes')
          .select('*, family_members(*)')
          .eq('family_id', familyId)
          .then(({ data }) => data && setNotes(data as FamilyNote[]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => {
        supabase
          .from('calendar_events')
          .select('*, family_members(*)')
          .eq('family_id', familyId)
          .then(({ data }) => data && setEvents(data as CalendarEvent[]));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { events, todos, shopping, chores, notes, meal, pkg, commute, upcoming, photos, connected };
}
