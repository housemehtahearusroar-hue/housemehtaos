'use client';

import { useEffect, useState } from 'react';
import { useClock } from '@/lib/hooks/useClock';
import type { SlideshowPhoto } from '@/lib/types';
import styles from './idle.module.css';

interface Props {
  show: boolean;
  photos: SlideshowPhoto[];
}

export function IdleOverlay({ show, photos }: Props) {
  const clock = useClock();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!show || photos.length < 2) return;
    const id = setInterval(() => {
      setVisible((v) => 1 - v);
      setIndex((i) => (i + 1) % photos.length);
    }, 5000);
    return () => clearInterval(id);
  }, [show, photos.length]);

  const current = photos[index] ?? photos[0];
  const prev = photos[(index - 1 + photos.length) % photos.length] ?? photos[0];

  return (
    <div className={`${styles.idle} ${show ? styles.idleShow : ''}`}>
      {photos.length >= 2 ? (
        <>
          <div
            className={`${styles.photo} ${visible === 0 ? styles.photoOn : ''}`}
            style={{ backgroundImage: `url('${prev?.url}')` }}
          />
          <div
            className={`${styles.photo} ${visible === 1 ? styles.photoOn : ''}`}
            style={{ backgroundImage: `url('${current?.url}')` }}
          />
        </>
      ) : (
        current && (
          <div
            className={`${styles.photo} ${styles.photoOn}`}
            style={{ backgroundImage: `url('${current.url}')` }}
          />
        )
      )}
      <div className={styles.scrim} />
      <div className={styles.iclock}>
        <div className={styles.iclockT}>{clock.timeShort}</div>
        <div className={styles.iclockD}>{clock.dateLine}</div>
      </div>
      {current && (
        <div className={styles.cap}>
          {current.caption}
          {current.location && <div className={styles.capLoc}>{current.location}</div>}
        </div>
      )}
      <div className={styles.wakehint}>🎙 Say &quot;Hey Aura&quot; to wake the mirror</div>
    </div>
  );
}
