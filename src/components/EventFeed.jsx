import React, { useMemo, useState } from 'react';
import EventCard from './EventCard';

const EventFeed = ({ data, onRerun }) => {
  const [minScore, setMinScore] = useState(0);
  const [query, setQuery] = useState('');

  const allEvents = useMemo(() => {
    if (!data?.output) return [];
    return data.output.flatMap(o => o.events.map(e => ({
      ...e,
      npub: o.npub,
      name: o.name,
      profile_pic: o.profile_pic,
      summary: o.summary,
      __model: data?.model || null
    })));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allEvents
      .filter(e => (e.relevancy_score ?? 0) >= minScore)
      .filter(e => {
        if (!q) return true;
        // Search in context_summary if this event is part of a thread, otherwise search in event_content
        const isThreadEvent = e.events_in_thread && e.events_in_thread.length > 0;
        const searchContent = isThreadEvent ? (e.context_summary || '') : (e.event_content || '');
        return String(searchContent).toLowerCase().includes(q);
      });
  }, [allEvents, minScore, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => (b.relevancy_score || 0) - (a.relevancy_score || 0) || (b.timestamp || 0) - (a.timestamp || 0));
    return copy;
  }, [filtered]);

  return (
    <div>

      {sorted.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 dark:text-gray-400">No events match your filters.</div>
      ) : (
        <div>
          {sorted.map((event, idx) => (
            <EventCard
              key={`${event.npub}-${event.timestamp}-${idx}`}
              event={event}
              npub={event.npub}
              name={event.name}
              profile_pic={event.profile_pic}
              onRerun={onRerun}
              model={event.__model || (typeof window !== 'undefined' ? (localStorage.getItem('user_model') || null) : null)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventFeed;
