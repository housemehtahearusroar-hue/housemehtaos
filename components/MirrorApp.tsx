'use client';

import { useCallback, useRef, useState } from 'react';
import { MirrorDisplay } from '@/components/mirror/MirrorDisplay';
import { AuraPanel } from '@/components/aura/AuraPanel';
import { IdleOverlay } from '@/components/idle/IdleOverlay';
import { useFamilyData } from '@/lib/hooks/useFamilyData';
import styles from '@/app/mirror.module.css';

export type DemoKind = 'dentist' | 'dinner' | 'shop';

export function MirrorApp() {
  const [mirrorState, setMirrorState] = useState<'active' | 'idle'>('active');
  const data = useFamilyData();
  const demoRef = useRef<((kind: DemoKind) => void) | null>(null);

  const wake = useCallback(() => setMirrorState('active'), []);

  return (
    <>
      <div className={styles.toolbar}>
        <span className={styles.brand}>Aura</span>
        <button
          className={`${styles.btn} ${mirrorState === 'active' ? styles.btnActive : ''}`}
          onClick={() => setMirrorState('active')}
          type="button"
        >
          Active display
        </button>
        <button
          className={`${styles.btn} ${mirrorState === 'idle' ? styles.btnActive : ''}`}
          onClick={() => setMirrorState('idle')}
          type="button"
        >
          Idle / slideshow
        </button>
        <span style={{ width: 12 }} />
        <button
          className={styles.btn}
          onClick={() => demoRef.current?.('dentist')}
          type="button"
        >
          ▶ Book dentist
        </button>
        <button
          className={styles.btn}
          onClick={() => demoRef.current?.('dinner')}
          type="button"
        >
          ▶ Reserve dinner
        </button>
        <button
          className={styles.btn}
          onClick={() => demoRef.current?.('shop')}
          type="button"
        >
          ▶ Shopping list
        </button>
      </div>

      <div className={styles.mirror}>
        <div className={styles.left}>
          <MirrorDisplay
            events={data.events}
            todos={data.todos}
            shopping={data.shopping}
            chores={data.chores}
            notes={data.notes}
            meal={data.meal}
            pkg={data.pkg}
            upcoming={data.upcoming}
          />
        </div>

        <AuraPanel onWake={wake} demoRef={demoRef} />

        <IdleOverlay show={mirrorState === 'idle'} photos={data.photos} />
      </div>

      <div className={styles.captionNote}>
        <b>Aura</b> — two-panel agentic family mirror. Left ⅔ is the always-on display; right ⅓ is
        Aura&apos;s view, where she answers in text and <i>shows</i> her work (slot pickers,
        reservations, list updates). Type in the box or run a demo above.
      </div>
    </>
  );
}
