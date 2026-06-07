'use client';

import { useEffect, useRef, useState } from 'react';

export function useBriefing(eventCount: number) {
  const [briefing, setBriefing] = useState('');
  const spokenRef = useRef(false);

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
    if (!briefing || spokenRef.current || typeof window === 'undefined') return;
    spokenRef.current = true;
    const utterance = new SpeechSynthesisUtterance(briefing);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [briefing]);

  return briefing;
}
