'use client';

import { useEffect, useState } from 'react';

export function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  if (!now) return { hours: '--', minutes: '--', ampm: '', dateLine: '' };

  let h = now.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const dateLine = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return { hours: String(h), minutes: m, ampm: ap, dateLine, timeShort: `${h}:${m}` };
}
