import { NextResponse } from 'next/server';

export const revalidate = 900;

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const lat = process.env.NEXT_PUBLIC_HOME_LAT ?? '37.7749';
  const lon = process.env.NEXT_PUBLIC_HOME_LON ?? '-122.4194';

  if (!apiKey) {
    return NextResponse.json({
      temp: 58,
      condition: 'Sunny',
      high: 74,
      low: 52,
      icon: '☀︎',
      mock: true,
    });
  }

  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`,
    { next: { revalidate: 900 } }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 502 });
  }

  const data = await res.json();
  const icons: Record<string, string> = {
    Clear: '☀︎',
    Clouds: '☁︎',
    Rain: '🌧',
    Snow: '❄︎',
    Drizzle: '🌦',
    Thunderstorm: '⛈',
  };

  return NextResponse.json({
    temp: Math.round(data.main.temp),
    condition: data.weather[0]?.main ?? 'Clear',
    high: Math.round(data.main.temp_max),
    low: Math.round(data.main.temp_min),
    icon: icons[data.weather[0]?.main] ?? '☀︎',
  });
}
