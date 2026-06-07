export interface CommuteResult {
  leaveBy: string;
  delayMinutes: number;
  routeNote: string;
  durationMinutes: number;
}

export async function getCommuteAlert(
  origin: string,
  destination: string
): Promise<CommuteResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    origins: origin,
    destinations: destination,
    departure_time: 'now',
    traffic_model: 'best_guess',
    key: apiKey,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
  );
  const data = await res.json();

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') return null;

  const durationSec = element.duration_in_traffic?.value ?? element.duration?.value ?? 0;
  const durationMinutes = Math.ceil(durationSec / 60);
  const baseMinutes = Math.ceil((element.duration?.value ?? durationSec) / 60);
  const delayMinutes = Math.max(0, durationMinutes - baseMinutes);

  const now = new Date();
  const targetArrival = new Date();
  targetArrival.setHours(8, 30, 0, 0);
  if (targetArrival < now) targetArrival.setDate(targetArrival.getDate() + 1);

  const leaveBy = new Date(targetArrival.getTime() - durationMinutes * 60 * 1000);

  return {
    leaveBy: leaveBy.toISOString(),
    delayMinutes,
    routeNote: element.duration_in_traffic?.text ?? element.duration?.text ?? '',
    durationMinutes,
  };
}
