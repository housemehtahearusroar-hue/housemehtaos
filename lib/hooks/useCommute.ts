'use client';

import { useEffect, useState } from 'react';

interface CommuteData {
  leaveBy: string;
  delayMinutes: number;
  routeNote: string;
  destination: string;
}

const FALLBACK: CommuteData = {
  leaveBy: '8:05 AM',
  delayMinutes: 6,
  routeNote: 'Route 9',
  destination: 'Lincoln Elementary',
};

export function useCommute() {
  const [commute, setCommute] = useState<CommuteData>(FALLBACK);

  useEffect(() => {
    fetch('/api/commute')
      .then((r) => r.json())
      .then((d) => setCommute(d))
      .catch(() => setCommute(FALLBACK));
  }, []);

  return commute;
}
