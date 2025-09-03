import React, { useMemo, useState } from 'react';
import EventCard from './EventCard';

const FilterBar = ({ onSortChange, onMinScoreChange, currentSort, minScore, onSearch }) => {
  return (
    <div className="card p-4 mb-6 sticky top-2 z-10">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Sort by</label>
          <select
            className="border rounded-lg px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-700"
            value={currentSort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="score">Relevancy</option>
            <option value="time">Newest</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">Min score</label>
          <input
            type="range"
            min="0"
            max="100"
            value={minScore}
            onChange={(e) => onMinScoreChange(Number(e.target.value))}
          />
          <span className="text-sm font-medium w-10 text-right">{minScore}</span>
        </div>

        <div className="flex-1 md:max-w-xs">
          <input
            type="text"
            placeholder="Search content..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>
    </div>
  );
};

const EventFeed = ({ data }) => {
  const [sortBy, setSortBy] = useState('score');
  const [minScore, setMinScore] = useState(0);
  const [query, setQuery] = useState('');

  const allEvents = useMemo(() => {
    if (!data?.output) return [];
    return data.output.flatMap(o => o.events.map(e => ({ ...e, npub: o.npub, summary: o.summary })));
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allEvents
      .filter(e => (e.relevancy_score ?? 0) >= minScore)
      .filter(e => !q || String(e.event_content).toLowerCase().includes(q));
  }, [allEvents, minScore, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === 'time') {
      copy.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else {
      copy.sort((a, b) => (b.relevancy_score || 0) - (a.relevancy_score || 0) || (b.timestamp || 0) - (a.timestamp || 0));
    }
    return copy;
  }, [filtered, sortBy]);

  return (
    <div>
      <FilterBar 
        currentSort={sortBy}
        onSortChange={setSortBy}
        minScore={minScore}
        onMinScoreChange={setMinScore}
        onSearch={setQuery}
      />

      {sorted.length === 0 ? (
        <div className="card p-10 text-center text-gray-500 dark:text-gray-400">No events match your filters.</div>
      ) : (
        <div>
          {sorted.map((event, idx) => (
            <EventCard key={`${event.npub}-${event.timestamp}-${idx}`} event={event} npub={event.npub} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventFeed;
