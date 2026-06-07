export interface BlandCallParams {
  phoneNumber: string;
  task: string;
  voice?: string;
  metadata?: Record<string, string>;
}

export async function placeBlandCall(params: BlandCallParams) {
  const apiKey = process.env.BLAND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      mock: true,
      message: 'Bland.ai not configured — simulated call placed',
      callId: `mock-${Date.now()}`,
    };
  }

  const res = await fetch('https://api.bland.ai/v1/calls', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: params.phoneNumber,
      task: params.task,
      voice: params.voice ?? 'maya',
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }

  const data = await res.json();
  return { ok: true, callId: data.call_id, status: data.status };
}
