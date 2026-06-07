'use client';

export type SpeechCallback = (transcript: string, isFinal: boolean) => void;

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startListening(onResult: SpeechCallback, onEnd?: () => void): () => void {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return () => {};

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: Event) => {
    const resultEvent = event as SpeechRecognitionEvent;
    let transcript = '';
    for (let i = resultEvent.resultIndex; i < resultEvent.results.length; i++) {
      transcript += resultEvent.results[i][0].transcript;
      onResult(transcript.trim(), resultEvent.results[i].isFinal);
    }
  };

  recognition.onend = () => onEnd?.();
  recognition.onerror = () => onEnd?.();

  recognition.start();
  return () => recognition.stop();
}

export function startHotwordListener(onHotword: () => void): () => void {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return () => {};

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: Event) => {
    const resultEvent = event as SpeechRecognitionEvent;
    for (let i = resultEvent.resultIndex; i < resultEvent.results.length; i++) {
      const text = resultEvent.results[i][0].transcript.toLowerCase();
      if (text.includes('hey aura') || text.includes('hey ora')) {
        onHotword();
        recognition.stop();
        return;
      }
    }
  };

  recognition.onend = () => {
    try {
      recognition.start();
    } catch {
      // ignore restart errors
    }
  };

  try {
    recognition.start();
  } catch {
    return () => {};
  }

  return () => recognition.stop();
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
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
