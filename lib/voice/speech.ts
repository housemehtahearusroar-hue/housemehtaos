'use client';

export type SpeechCallback = (transcript: string, isFinal: boolean) => void;

export type SpeechError =
  | 'not-allowed'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'audio-capture'
  | 'not-supported'
  | 'service-not-allowed'
  | 'busy'
  | 'unknown';

export interface HotwordController {
  pause: () => void;
  resume: () => void;
  dispose: () => void;
}

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

function isSafari(): boolean {
  return typeof navigator !== 'undefined' && navigator.vendor.includes('Apple');
}

/** Safari often keeps the mic "open" unless start() is called immediately before stop(). */
function safelyStopRecognition(recognition: SpeechRecognition): void {
  if (isSafari()) {
    try {
      recognition.start();
    } catch {
      // already running or unavailable
    }
  }
  try {
    recognition.stop();
  } catch {
    // ignore
  }
}

export function createHotwordListener(onHotword: () => void): HotwordController {
  const SpeechRecognition = getRecognitionCtor();
  if (!SpeechRecognition) {
    return { pause: () => {}, resume: () => {}, dispose: () => {} };
  }

  let paused = false;
  let disposed = false;
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  const start = () => {
    if (paused || disposed) return;
    try {
      recognition.start();
    } catch {
      // mic busy — manual mic click will retry after pause
    }
  };

  recognition.onresult = (event: Event) => {
    const resultEvent = event as SpeechRecognitionEvent;
    for (let i = resultEvent.resultIndex; i < resultEvent.results.length; i++) {
      const text = resultEvent.results[i][0].transcript.toLowerCase();
      if (text.includes('hey aura') || text.includes('hey ora')) {
        paused = true;
        safelyStopRecognition(recognition);
        onHotword();
        return;
      }
    }
  };

  recognition.onend = () => {
    if (!paused && !disposed) start();
  };

  recognition.onerror = (event: Event) => {
    const err = (event as SpeechRecognitionErrorEvent).error;
    if (err === 'aborted' || err === 'no-speech') return;
    if (!paused && !disposed) start();
  };

  start();

  return {
    pause: () => {
      paused = true;
      safelyStopRecognition(recognition);
    },
    resume: () => {
      if (disposed) return;
      paused = false;
      start();
    },
    dispose: () => {
      disposed = true;
      paused = true;
      safelyStopRecognition(recognition);
    },
  };
}

export function startListening(
  onResult: SpeechCallback,
  options?: {
    onEnd?: (error?: SpeechError) => void;
    onStart?: () => void;
  }
): () => void {
  const SpeechRecognition = getRecognitionCtor();
  if (!SpeechRecognition) {
    options?.onEnd?.('not-supported');
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let stopped = false;

  recognition.onresult = (event: Event) => {
    const resultEvent = event as SpeechRecognitionEvent;
    let transcript = '';
    for (let i = resultEvent.resultIndex; i < resultEvent.results.length; i++) {
      transcript += resultEvent.results[i][0].transcript;
      onResult(transcript.trim(), resultEvent.results[i].isFinal);
    }
  };

  recognition.onstart = () => options?.onStart?.();

  recognition.onend = () => {
    if (!stopped) options?.onEnd?.();
  };

  recognition.onerror = (event: Event) => {
    const err = (event as SpeechRecognitionErrorEvent).error as SpeechError;
    if (err === 'aborted') return;
    options?.onEnd?.(err || 'unknown');
  };

  try {
    recognition.start();
  } catch {
    options?.onEnd?.('busy');
    return () => {};
  }

  return () => {
    stopped = true;
    safelyStopRecognition(recognition);
  };
}

/** User-facing hint for mic / speech errors. */
export function speechErrorMessage(error?: SpeechError): string {
  switch (error) {
    case 'not-supported':
      return 'Voice not supported here — use Chrome or type below';
    case 'not-allowed':
      return 'Mic blocked — allow microphone for this site in Safari';
    case 'service-not-allowed':
      return 'Enable Speech Recognition in System Settings → Privacy';
    case 'no-speech':
      return "Didn't catch that — tap 🎙 and speak again";
    case 'network':
      return 'Voice needs internet — check connection and retry';
    case 'audio-capture':
      return 'No microphone found — check System Settings';
    case 'busy':
      return 'Mic busy — wait a moment, then tap 🎙 again';
    default:
      return 'Ready · tap 🎙 to speak';
  }
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
