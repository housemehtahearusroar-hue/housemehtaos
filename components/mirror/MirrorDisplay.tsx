'use client';

import { useClock } from '@/lib/hooks/useClock';
import { useWeather } from '@/lib/hooks/useWeather';
import { useCommute } from '@/lib/hooks/useCommute';
import { useBriefing } from '@/lib/hooks/useBriefing';
import type {
  CalendarEvent,
  ChorePoint,
  FamilyNote,
  Meal,
  Package,
  ShoppingItem,
  Todo,
  UpcomingItem,
} from '@/lib/types';
import styles from './mirror-widgets.module.css';

interface Props {
  events: CalendarEvent[];
  todos: Todo[];
  shopping: ShoppingItem[];
  chores: ChorePoint[];
  notes: FamilyNote[];
  meal: Meal | null;
  pkg: Package | null;
  upcoming: UpcomingItem[];
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function renderStars(count: number) {
  const on = '★'.repeat(Math.min(count, 5));
  const off = '★'.repeat(Math.max(0, 5 - count));
  return (
    <span>
      <span className={styles.starsOn}>{on}</span>
      <span className={styles.starsOff}>{off}</span>
    </span>
  );
}

export function MirrorDisplay({
  events,
  todos,
  shopping,
  chores,
  notes,
  meal,
  pkg,
  upcoming,
}: Props) {
  const clock = useClock();
  const weather = useWeather();
  const commute = useCommute();
  const briefing = useBriefing(events.length);

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <div>
          <div className={styles.time}>
            <span>{clock.hours}</span>:<span>{clock.minutes}</span>
            <span className={styles.ampm}>{clock.ampm}</span>
          </div>
          <div className={styles.date}>{clock.dateLine}</div>
        </div>
        <div className={styles.wx}>
          <div className={styles.temp}>{weather.temp}°</div>
          <div className={styles.cond}>
            {weather.icon} {weather.condition}
          </div>
          <div className={styles.range}>
            H {weather.high}° · L {weather.low}°
          </div>
        </div>
      </div>

      <div className={styles.greet}>
        Good morning, <b>Mehta family</b>
      </div>
      <div className={styles.briefing}>
        {briefing || (
          <>
            Busy one today — <span className={styles.hl}>{events.length} events</span>
          </>
        )}
      </div>

      <div className={styles.w}>
        <div className={styles.wTitle}>
          📅 Today<span className={styles.meta}>{events.length} events</span>
        </div>
        {events.map((ev) => (
          <div key={ev.id} className={styles.ev}>
            <div className={styles.evTime}>{formatEventTime(ev.starts_at)}</div>
            <div
              className={styles.bar}
              style={{ background: ev.family_members?.color ?? 'var(--accent)' }}
            />
            <div>
              <div className={styles.evTitle}>{ev.title}</div>
              <div className={styles.who}>
                {ev.family_members && (
                  <span
                    className={styles.whoDot}
                    style={{ background: ev.family_members.color }}
                  />
                )}
                {ev.family_members?.name}
                {ev.location ? ` · ${ev.location}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`${styles.w} ${styles.cols}`}>
        <div>
          <div className={styles.wTitle}>✓ To-dos</div>
          {todos.map((t) => (
            <div key={t.id} className={`${styles.row} ${t.done ? styles.rowDone : ''}`}>
              <span className={`${styles.check} ${t.done ? styles.checkDone : ''}`} />
              <span>{t.text}</span>
              {t.family_members && <span className={styles.tag}>{t.family_members.name}</span>}
            </div>
          ))}
        </div>
        <div>
          <div className={styles.wTitle}>🛒 Shopping</div>
          {shopping.map((s) => (
            <div key={s.id} className={styles.row}>
              <span className={styles.check} />
              <span>
                {s.text}
                {s.quantity ? ` (${s.quantity})` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.w}>
        <div className={styles.wTitle}>
          ⭐ Chore chart<span className={styles.meta}>this week</span>
        </div>
        {chores.map((c) => (
          <div key={c.id} className={styles.chore}>
            <span className={styles.choreName}>{c.family_members?.name}</span>
            {renderStars(c.stars)}
            <span className={styles.pts}>{c.points} pts</span>
          </div>
        ))}
      </div>

      <div className={`${styles.w} ${styles.cols3}`}>
        {meal && (
          <div className={styles.mini}>
            <div className={styles.lbl}>🍽 Dinner tonight</div>
            <div className={styles.val}>{meal.title}</div>
            <div className={styles.sub}>
              {meal.prep_minutes} min · {meal.on_list ? 'on list' : 'not on list'}
            </div>
          </div>
        )}
        {pkg && (
          <div className={styles.mini}>
            <div className={styles.lbl}>📦 Arriving today</div>
            <div className={styles.val}>
              {pkg.count} package{pkg.count !== 1 ? 's' : ''}
            </div>
            <div className={styles.sub}>
              {pkg.carrier} · {pkg.eta_text}
            </div>
          </div>
        )}
      </div>

      <div className={styles.w}>
        <div className={styles.alert}>
          🚗&nbsp;
          <div>
            Leave by <b>{commute.leaveBy}</b> — {commute.delayMinutes} min delay on{' '}
            {commute.routeNote} to {commute.destination}.
          </div>
        </div>
      </div>

      <div className={styles.w}>
        <div className={styles.wTitle}>🎂 Coming up</div>
        <div className={styles.strip}>
          {upcoming.map((u) => (
            <div key={u.id} className={styles.pill}>
              <div className={styles.pillD}>{u.label}</div>
              <div className={styles.pillN}>{u.title}</div>
              {u.subtitle && <div className={styles.pillX}>{u.subtitle}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.w}>
        <div className={styles.wTitle}>📌 Family notes</div>
        {notes.map((n) => (
          <div key={n.id} className={styles.note}>
            {n.family_members && (
              <div className={styles.noteFrom}>From {n.family_members.name}</div>
            )}
            {n.body}
          </div>
        ))}
      </div>
    </div>
  );
}
