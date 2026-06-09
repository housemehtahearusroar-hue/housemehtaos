export function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfLocalWeek(d = new Date()): Date {
  const end = startOfLocalDay(d);
  end.setDate(end.getDate() + 7);
  return end;
}

export function isSameLocalDay(iso: string, day = new Date()): boolean {
  return new Date(iso).toDateString() === day.toDateString();
}

export function formatEventDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
