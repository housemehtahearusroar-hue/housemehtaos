'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { initPorcupine } from '@/lib/voice/porcupine';
import { startHotwordListener, startListening, isSpeechSupported } from '@/lib/voice/speech';
import styles from './aura.module.css';

interface UIItem {
  id: string;
  kind: 'user' | 'aura' | 'show_card' | 'action' | 'confirm';
  text?: string;
  options?: { id: string; ic?: string; ti: string; sub?: string; rt?: string }[];
  pickedId?: string;
  actionLabel?: string;
  actionDone?: string;
  confirmTitle?: string;
  confirmLines?: [string, string][];
  actionPending?: boolean;
}

const HINTS = [
  "Book Maya's dentist cleaning",
  'Reserve dinner Saturday at 7',
  'Add paper towels and coffee',
];

export function AuraPanel({
  onWake,
  demoRef,
}: {
  onWake?: () => void;
  demoRef?: React.MutableRefObject<((kind: 'dentist' | 'dinner' | 'shop') => void) | null>;
}) {
  const [status, setStatus] = useState('Ready · say "Hey Aura"');
  const [live, setLive] = useState(false);
  const [input, setInput] = useState('');
  const [uiItems, setUiItems] = useState<UIItem[]>([]);
  const convoRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status: chatStatus } = useChat({
    transport: new DefaultChatTransport({ api: '/api/aura' }),
    onFinish: ({ message }) => {
      const text = message.parts
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('');

      if (text) {
        setUiItems((prev) => [
          ...prev,
          { id: crypto.randomUUID(), kind: 'aura', text },
        ]);
      }
      setStatus('Ready · say "Hey Aura"');
      setLive(false);
    },
    onError: () => {
      setStatus('Ready · say "Hey Aura"');
      setLive(false);
    },
  });

  useEffect(() => {
    if (chatStatus === 'streaming' || chatStatus === 'submitted') {
      setStatus('Thinking…');
      setLive(true);
    }
  }, [chatStatus]);

  useEffect(() => {
    convoRef.current?.scrollTo({ top: convoRef.current.scrollHeight });
  }, [uiItems, messages]);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      onWake?.();
      setUiItems((prev) => [
        ...prev,
        { id: crypto.randomUUID(), kind: 'user', text: text.trim() },
      ]);
      setInput('');
      setStatus('Thinking…');
      setLive(true);
      await sendMessage({ text: text.trim() });
    },
    [sendMessage, onWake]
  );

  const runDemo = useCallback(
    async (kind: 'dentist' | 'dinner' | 'shop', typed?: string) => {
      onWake?.();
      setLive(true);

      if (kind === 'dentist') {
        setStatus('Listening…');
        const msg = typed ?? "Book Maya's 6-month dental cleaning with Dr. Lin.";
        setUiItems((prev) => [...prev, { id: 'u1', kind: 'user', text: msg }]);
        await new Promise((r) => setTimeout(r, 600));
        setStatus("Checking Dr. Lin's availability…");
        await new Promise((r) => setTimeout(r, 700));
        setUiItems((prev) => [
          ...prev,
          { id: 'a1', kind: 'aura', text: 'Dr. Lin has two openings after school this week:' },
          {
            id: 'c1',
            kind: 'show_card',
            options: [
              { id: 'tue', ic: '🦷', ti: 'Tuesday 3:30 PM', sub: 'Dr. Lin · Maplewood Dental', rt: 'after school' },
              { id: 'thu', ic: '🦷', ti: 'Thursday 4:15 PM', sub: 'Dr. Lin · Maplewood Dental', rt: 'after school' },
            ],
          },
          { id: 'a2', kind: 'aura', text: 'Which should I book?' },
        ]);
        await new Promise((r) => setTimeout(r, 700));
        setUiItems((prev) => [...prev, { id: 'u2', kind: 'user', text: 'Thursday.' }]);
        await new Promise((r) => setTimeout(r, 400));
        setUiItems((prev) =>
          prev.map((i) => (i.id === 'c1' ? { ...i, pickedId: 'thu' } : i))
        );
        setUiItems((prev) => [
          ...prev,
          { id: 'act1', kind: 'action', actionLabel: 'Calling Maplewood Dental to book…', actionPending: true },
        ]);
        await new Promise((r) => setTimeout(r, 1700));
        setUiItems((prev) =>
          prev.map((i) =>
            i.id === 'act1'
              ? { ...i, actionPending: false, actionDone: 'Booked — Thu 4:15 PM' }
              : i
          )
        );
        setUiItems((prev) => [
          ...prev,
          {
            id: 'conf1',
            kind: 'confirm',
            confirmTitle: 'Appointment booked',
            confirmLines: [
              ['When', 'Thu · 4:15 PM'],
              ['Who', 'Maya · Dr. Lin'],
              ['Added to', 'Family calendar'],
              ['Reminder', 'Leave by 3:50 PM'],
            ],
          },
          { id: 'a3', kind: 'aura', text: "Done — it's on Maya's calendar. Want me to text Priya the details?" },
        ]);
        await sendMessage({ text: msg });
      }

      if (kind === 'dinner') {
        const msg = typed ?? 'Reserve dinner for 4 on Saturday around 7.';
        setUiItems((prev) => [...prev, { id: 'u1', kind: 'user', text: msg }]);
        await new Promise((r) => setTimeout(r, 600));
        setUiItems((prev) => [
          ...prev,
          { id: 'a1', kind: 'aura', text: 'Two spots have a 7pm table for 4 on Saturday:' },
          {
            id: 'c1',
            kind: 'show_card',
            options: [
              { id: 'tav', ic: '🍝', ti: 'Tavola', sub: 'Italian · 0.8 mi · ★4.6', rt: '7:00 PM' },
              { id: 'saf', ic: '🍛', ti: 'Saffron', sub: 'Indian · 1.2 mi · ★4.7', rt: '7:15 PM' },
            ],
          },
        ]);
        await new Promise((r) => setTimeout(r, 700));
        setUiItems((prev) => [...prev, { id: 'u2', kind: 'user', text: 'Tavola.' }]);
        setUiItems((prev) => prev.map((i) => (i.id === 'c1' ? { ...i, pickedId: 'tav' } : i)));
        setUiItems((prev) => [
          ...prev,
          { id: 'act1', kind: 'action', actionLabel: 'Reserving via OpenTable…', actionPending: true },
        ]);
        await new Promise((r) => setTimeout(r, 1700));
        setUiItems((prev) =>
          prev.map((i) =>
            i.id === 'act1' ? { ...i, actionPending: false, actionDone: 'Reserved — Sat 7:00 PM' } : i
          )
        );
        setUiItems((prev) => [
          ...prev,
          {
            id: 'conf1',
            kind: 'confirm',
            confirmTitle: 'Table reserved',
            confirmLines: [
              ['When', 'Sat · 7:00 PM'],
              ['Where', 'Tavola · party of 4'],
              ['Added to', 'Family calendar'],
              ['Reminder', 'Leave 6:15 PM'],
            ],
          },
          { id: 'a3', kind: 'aura', text: 'Booked at Tavola for 4. Want me to arrange a sitter for the kids?' },
        ]);
        await sendMessage({ text: msg });
      }

      if (kind === 'shop') {
        const msg = typed ?? "We're out of paper towels — add that and coffee.";
        setUiItems((prev) => [...prev, { id: 'u1', kind: 'user', text: msg }]);
        await new Promise((r) => setTimeout(r, 600));
        setUiItems((prev) => [
          ...prev,
          { id: 'act1', kind: 'action', actionLabel: 'Adding items to shopping list…', actionPending: true },
        ]);
        await new Promise((r) => setTimeout(r, 1700));
        setUiItems((prev) =>
          prev.map((i) =>
            i.id === 'act1' ? { ...i, actionPending: false, actionDone: '2 items added' } : i
          )
        );
        setUiItems((prev) => [
          ...prev,
          {
            id: 'conf1',
            kind: 'confirm',
            confirmTitle: 'Shopping list updated',
            confirmLines: [
              ['Added', 'Paper towels, Coffee'],
              ['List total', '4 items'],
            ],
          },
          { id: 'a3', kind: 'aura', text: 'Added. You usually get Bounty and the dark roast — reorder those to arrive Thursday?' },
        ]);
        await sendMessage({ text: msg });
      }

      setStatus('Ready · say "Hey Aura"');
      setLive(false);
    },
    [sendMessage, onWake]
  );

  const route = useCallback(
    (text: string) => {
      const t = text.toLowerCase();
      if (/dentist|dental|cleaning|dr\.? lin/.test(t)) return runDemo('dentist', text);
      if (/reserve|dinner|table|restaurant|book.*\d|tavola/.test(t)) return runDemo('dinner', text);
      if (/add|shop|grocery|towel|coffee|milk|list/.test(t)) return runDemo('shop', text);
      return handleSubmit(text);
    },
    [runDemo, handleSubmit]
  );

  const beginListening = useCallback(() => {
    if (!isSpeechSupported()) return;
    setStatus('Listening…');
    setLive(true);
    startListening(
      (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal && transcript.trim()) {
          route(transcript.trim());
        }
      },
      () => {
        setLive(false);
        setStatus('Ready · say "Hey Aura"');
      }
    );
  }, [route]);

  useEffect(() => {
    if (demoRef) demoRef.current = runDemo;
  }, [demoRef, runDemo]);

  useEffect(() => {
    let cleanup = () => {};
    const setup = async () => {
      const porcupineCleanup = await initPorcupine(() => {
        onWake?.();
        beginListening();
      });
      const speechCleanup = startHotwordListener(() => {
        onWake?.();
        beginListening();
      });
      cleanup = () => {
        porcupineCleanup();
        speechCleanup();
      };
    };
    setup();
    return () => cleanup();
  }, [beginListening, onWake]);

  const empty = uiItems.length === 0 && messages.length === 0;

  return (
    <div className={styles.right}>
      <div className={styles.auraHead}>
        <div className={`${styles.orb} ${live ? styles.orbLive : ''}`} />
        <div>
          <div className={styles.nm}>Aura</div>
          <div className={styles.st}>{status}</div>
        </div>
      </div>

      <div className={styles.convo} ref={convoRef}>
        {empty && (
          <div className={styles.empty}>
            <div className={styles.emptyBig}>Hi, I&apos;m Aura 👋</div>
            Ask me to book appointments, plan meals, or update your lists. I&apos;ll show what I&apos;m
            doing right here.
          </div>
        )}

        {uiItems.map((item) => {
          if (item.kind === 'user') {
            return (
              <div key={item.id} className={`${styles.bubble} ${styles.bubbleUser}`}>
                <span className={styles.bubbleWho}>You</span>
                {item.text}
              </div>
            );
          }
          if (item.kind === 'aura') {
            return (
              <div key={item.id} className={`${styles.bubble} ${styles.bubbleAura}`}>
                <span className={styles.bubbleWho}>Aura</span>
                {item.text}
              </div>
            );
          }
          if (item.kind === 'show_card' && item.options) {
            return (
              <div key={item.id} className={styles.showCard}>
                {item.options.map((o) => (
                  <div
                    key={o.id}
                    className={`${styles.opt} ${item.pickedId === o.id ? styles.optPicked : ''} ${item.pickedId && item.pickedId !== o.id ? styles.optDim : ''}`}
                  >
                    <span className={styles.optIc}>{o.ic}</span>
                    <span>
                      <span className={styles.optTi}>{o.ti}</span>
                      {o.sub && <div className={styles.optSub}>{o.sub}</div>}
                    </span>
                    {item.pickedId === o.id ? (
                      <span className={styles.badge}>Selected ✓</span>
                    ) : (
                      o.rt && <span className={styles.optRt}>{o.rt}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          }
          if (item.kind === 'action') {
            return (
              <div key={item.id} className={`${styles.bubble} ${styles.bubbleAura}`}>
                <span className={`${styles.act} ${!item.actionPending ? styles.actDone : ''}`}>
                  {item.actionPending && <span className={styles.spin} />}
                  {item.actionPending ? item.actionLabel : `✓ ${item.actionDone}`}
                </span>
              </div>
            );
          }
          if (item.kind === 'confirm') {
            return (
              <div key={item.id} className={styles.confirm}>
                <div className={styles.confirmCh}>✓ {item.confirmTitle}</div>
                {item.confirmLines?.map(([k, v]) => (
                  <div key={k} className={styles.confirmLn}>
                    <span className={styles.confirmK}>{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}

        {messages.map((m) => {
          if (m.role !== 'assistant') return null;
          const text = m.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('');
          if (!text || uiItems.some((i) => i.kind === 'aura' && i.text === text)) return null;
          return (
            <div key={m.id} className={`${styles.bubble} ${styles.bubbleAura}`}>
              <span className={styles.bubbleWho}>Aura</span>
              {text}
            </div>
          );
        })}
      </div>

      <div className={styles.dock}>
        <div className={styles.inwrap}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or speak to Aura…"
            autoComplete="off"
            onKeyDown={(e) => e.key === 'Enter' && route(input)}
          />
          <button
            className={`${styles.micbtn} ${live ? styles.micbtnLive : ''}`}
            onClick={beginListening}
            title="Voice"
            type="button"
          >
            🎙
          </button>
          <button className={styles.send} onClick={() => route(input)} title="Send" type="button">
            ➤
          </button>
        </div>
        <div className={styles.hintchips}>
          {HINTS.map((h) => (
            <div key={h} className={styles.chip} onClick={() => setInput(h)}>
              {h.includes('dentist') ? 'Book dentist' : h.includes('dinner') ? 'Reserve dinner' : 'Add to shopping'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
