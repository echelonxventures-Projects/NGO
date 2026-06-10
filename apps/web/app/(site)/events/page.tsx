import { api } from '@/lib/api';
import EventRegister from './EventRegister';

export const metadata = { title: 'Events' };

export default async function EventsPage() {
  const events = await api.listEvents();
  return (
    <main className="section container">
      <h1>Events</h1>
      {events && events.length > 0 ? (
        events.map((ev) => (
          <div className="card" key={ev.id} style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>{ev.title}</h3>
            <p className="stat-sub">
              {new Date(ev.startsAt).toLocaleString()} · {ev.mode}
              {ev.location ? ` · ${ev.location}` : ''} ·{' '}
              {ev.price === 0 ? 'Free' : `${ev.currency} ${(ev.price / 100).toFixed(2)}`}
            </p>
            {ev.description && <p>{ev.description}</p>}
            <EventRegister eventId={ev.id} />
          </div>
        ))
      ) : (
        <p>No upcoming events.</p>
      )}
    </main>
  );
}
