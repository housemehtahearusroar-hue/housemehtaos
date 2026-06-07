export const DEFAULT_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

export interface FamilyMember {
  id: string;
  family_id: string;
  name: string;
  color: string;
  avatar: string | null;
}

export interface CalendarEvent {
  id: string;
  family_id: string;
  member_id: string | null;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  family_members?: FamilyMember | null;
}

export interface Todo {
  id: string;
  family_id: string;
  text: string;
  done: boolean;
  assigned_to: string | null;
  family_members?: FamilyMember | null;
}

export interface ShoppingItem {
  id: string;
  family_id: string;
  text: string;
  quantity: string | null;
  done: boolean;
}

export interface ChorePoint {
  id: string;
  member_id: string;
  stars: number;
  points: number;
  family_members?: FamilyMember | null;
}

export interface FamilyNote {
  id: string;
  from_member_id: string | null;
  body: string;
  pinned: boolean;
  family_members?: FamilyMember | null;
}

export interface Meal {
  id: string;
  title: string;
  prep_minutes: number | null;
  on_list: boolean;
}

export interface Package {
  id: string;
  carrier: string | null;
  count: number;
  eta_text: string | null;
}

export interface CommuteAlert {
  id: string;
  destination: string;
  leave_by: string;
  delay_minutes: number;
  route_note: string | null;
}

export interface UpcomingItem {
  id: string;
  label: string;
  title: string;
  subtitle: string | null;
}

export interface SlideshowPhoto {
  id: string;
  url: string;
  caption: string | null;
  location: string | null;
}

export interface WeatherData {
  temp: number;
  condition: string;
  high: number;
  low: number;
  icon: string;
}

export interface AuraUIEvent {
  type: 'show_card' | 'action' | 'confirm' | 'pick';
  payload: Record<string, unknown>;
}

export interface MemoryNode {
  id: string;
  type: string;
  label: string;
  content: string;
}

export interface MemoryEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  weight: number;
}
