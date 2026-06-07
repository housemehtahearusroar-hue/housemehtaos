'use client';

import { useEffect, useState } from 'react';
import type { WeatherData } from '@/lib/types';

const FALLBACK: WeatherData = { temp: 58, condition: 'Sunny', high: 74, low: 52, icon: '☀︎' };

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData>(FALLBACK);

  useEffect(() => {
    fetch('/api/weather')
      .then((r) => r.json())
      .then((d) => setWeather(d))
      .catch(() => setWeather(FALLBACK));
  }, []);

  return weather;
}
