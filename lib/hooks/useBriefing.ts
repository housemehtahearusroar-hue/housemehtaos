'use client';

import { useEffect, useState } from 'react';

export function useBriefing(eventCount: number) {
  const [briefing, setBriefing] = useState('');
  const [spoken, setSpoken] = useState(false);

  useEffect(() => {
    fetch('/api/briefing')
      .then((r) => r.json())
      .then((d) => setBriefing(d.briefing))
      .catch(() => {
        setBriefing(
          `Busy one today — ${eventCount} events on the calendar. Check the display for details.`
        );
      });
  }, [eventCount]);

  useEffect(() => {
    if (!briefing || spoken || typeof window === 'undefined') return;
    const utterance = new SpeechSynthesisUtterance(briefing);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
    setSpoken(true);
  }, [briefing, spoken]);

  return briefing;
}
