import type {
  CalendarEvent,
  ChorePoint,
  CommuteAlert,
  FamilyMember,
  FamilyNote,
  Meal,
  Package,
  ShoppingItem,
  SlideshowPhoto,
  Todo,
  UpcomingItem,
} from '@/lib/types';

export const MOCK_MEMBERS: FamilyMember[] = [
  { id: '1', family_id: '1', name: 'Gaurav', color: '#6ec1ff', avatar: null },
  { id: '2', family_id: '1', name: 'Maya', color: '#ff8fb1', avatar: null },
  { id: '3', family_id: '1', name: 'Arjun', color: '#5fd28a', avatar: null },
  { id: '4', family_id: '1', name: 'Priya', color: '#b89bff', avatar: null },
];

const today = new Date();

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    family_id: '1',
    member_id: '1',
    title: 'Drop-off + standup',
    location: null,
    starts_at: new Date(today.setHours(8, 30)).toISOString(),
    ends_at: null,
    family_members: MOCK_MEMBERS[0],
  },
  {
    id: '2',
    family_id: '1',
    member_id: '2',
    title: 'Dentist — Maya',
    location: 'Dr. Lin',
    starts_at: new Date(new Date().setHours(13, 0)).toISOString(),
    ends_at: null,
    family_members: MOCK_MEMBERS[1],
  },
  {
    id: '3',
    family_id: '1',
    member_id: '3',
    title: 'Soccer pickup',
    location: null,
    starts_at: new Date(new Date().setHours(17, 30)).toISOString(),
    ends_at: null,
    family_members: MOCK_MEMBERS[2],
  },
];

export const MOCK_TODOS: Todo[] = [
  { id: '1', family_id: '1', text: 'Pay water bill', done: true, assigned_to: null },
  { id: '2', family_id: '1', text: 'Sign permission slip', done: false, assigned_to: '2', family_members: MOCK_MEMBERS[1] },
  { id: '3', family_id: '1', text: 'Call plumber', done: false, assigned_to: null },
];

export const MOCK_SHOPPING: ShoppingItem[] = [
  { id: '1', family_id: '1', text: 'Milk', quantity: null, done: false },
  { id: '2', family_id: '1', text: 'Eggs', quantity: null, done: false },
];

export const MOCK_CHORES: ChorePoint[] = [
  { id: '1', member_id: '2', stars: 4, points: 80, family_members: MOCK_MEMBERS[1] },
  { id: '2', member_id: '3', stars: 3, points: 60, family_members: MOCK_MEMBERS[2] },
];

export const MOCK_NOTES: FamilyNote[] = [
  { id: '1', from_member_id: '4', body: 'Arjun has a dentist form in his backpack — sign before Wed!', pinned: true, family_members: MOCK_MEMBERS[3] },
  { id: '2', from_member_id: '2', body: 'Can we do pizza Friday? 🍕', pinned: true, family_members: MOCK_MEMBERS[1] },
];

export const MOCK_MEAL: Meal = { id: '1', title: 'Lemon herb chicken', prep_minutes: 35, on_list: true };
export const MOCK_PACKAGE: Package = { id: '1', carrier: 'Amazon', count: 2, eta_text: 'by 4 PM' };
export const MOCK_COMMUTE: CommuteAlert = {
  id: '1',
  destination: 'Lincoln Elementary',
  leave_by: new Date(new Date().setHours(8, 5)).toISOString(),
  delay_minutes: 6,
  route_note: 'Route 9',
};

export const MOCK_UPCOMING: UpcomingItem[] = [
  { id: '1', label: 'In 4 days', title: "Grandma's birthday", subtitle: '🎁 gift idea ready' },
  { id: '2', label: 'Wed', title: 'Maya — early dismissal', subtitle: '1:15 PM' },
  { id: '3', label: 'Fri', title: 'Arjun — field trip', subtitle: 'pack lunch' },
  { id: '4', label: 'Jun 21', title: 'Anniversary', subtitle: '🎁 plan dinner' },
];

export const MOCK_PHOTOS: SlideshowPhoto[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1100&q=80',
    caption: 'Beach day, last summer',
    location: 'Santa Cruz · July 2025',
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1602771968066-0acb09bcc5a7?w=1100&q=80',
    caption: 'Family hike',
    location: 'Yosemite · August 2025',
  },
];
