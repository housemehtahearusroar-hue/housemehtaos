'use client';

/**
 * Porcupine hotword hook — optional enhancement.
 * Requires public/wake-word/hey-aura.ppn + porcupine_params.pv and
 * NEXT_PUBLIC_PICOVOICE_ACCESS_KEY. When unavailable, AuraPanel falls
 * back to Web Speech API continuous "Hey Aura" detection.
 */
export async function initPorcupine(_onHotword: () => void): Promise<() => void> {
  const accessKey = process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY;
  if (!accessKey || typeof window === 'undefined') return () => {};

  try {
    const mod = '@picovoice/porcupine-web';
    const { PorcupineWorker } = await import(/* webpackIgnore: true */ mod);
    const worker = await PorcupineWorker.create(
      accessKey,
      { publicPath: '/wake-word/hey-aura.ppn', label: 'Hey Aura' },
      () => _onHotword(),
      { publicPath: '/wake-word/porcupine_params.pv' }
    );
    await worker.start();
    return () => worker.release();
  } catch {
    return () => {};
  }
}
