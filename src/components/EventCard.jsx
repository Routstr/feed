import React from 'react';

const EventCard = ({ event, npub }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const score = Number(event.relevancy_score) || 0;

  const scoreColor = (s) => {
    if (s >= 85) return 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30';
    if (s >= 70) return 'text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/30';
    if (s >= 50) return 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30';
    if (s >= 30) return 'text-orange-700 bg-orange-100 dark:text-orange-200 dark:bg-orange-900/30';
    return 'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/30';
  };

  const barColor = (s) => {
    if (s >= 85) return 'bg-emerald-500';
    if (s >= 70) return 'bg-blue-500';
    if (s >= 50) return 'bg-amber-500';
    if (s >= 30) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const truncateNpub = (val) => (val ? `${val.slice(0, 12)}…${val.slice(-8)}` : 'Unknown');

  const content = String(event.event_content || '');
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const contentParts = content.split(urlRegex);

  return (
    <article className="card p-5 mb-4 shadow-card">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 ring-2 ring-white dark:ring-gray-800 flex items-center justify-center text-white font-semibold">
            {npub ? npub.slice(4, 6).toUpperCase() : 'NP'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {truncateNpub(npub)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(event.timestamp)}</p>
            </div>
            <div className={`pill ${scoreColor(score)} whitespace-nowrap`}>
              Relevancy: {score}%
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none mt-3">
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {contentParts.map((part, i) =>
                urlRegex.test(part) ? (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer">
                    {part}
                  </a>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
          </div>

          {/* Relevancy bar */}
          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full ${barColor(score)} transition-all`}
                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
              />
            </div>
          </div>

          {/* Footer actions (non-functional placeholders) */}
          <div className="flex items-center gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400">
            <button className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4"/>
              </svg>
              Reply
            </button>
            <button className="hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 0 15.5 6.5M21 12A9 9 0 0 0 5.5 5.5"/>
                <path d="M17 7v4h-4"/>
                <path d="M7 17v-4h4"/>
              </svg>
              Repost
            </button>
            <button className="hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Like
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default EventCard;
