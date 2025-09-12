import React, { useState, useEffect, useRef } from 'react';

const EventCard = ({ event, npub, name, profile_pic, onRerun, hideActions, model }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const score = Number(event.relevancy_score) || 0;

  const reason = event.reason_for_score || '';

  const [showReason, setShowReason] = useState(false);
  const reasonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showReason) return;
      if (reasonRef.current && !reasonRef.current.contains(e.target)) {
        setShowReason(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showReason]);

  const scoreColor = (s) => {
    if (s >= 85) return 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30';
    if (s >= 70) return 'text-blue-700 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/30';
    if (s >= 50) return 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30';
    if (s >= 30) return 'text-orange-700 bg-orange-100 dark:text-orange-200 dark:bg-orange-900/30';
    return 'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/30';
  };

  

  const truncateNpub = (val) => (val ? `${val.slice(0, 12)}…${val.slice(-8)}` : 'Unknown');

  // Display context_summary in addition to event_content when this event is part of a thread
  const isThreadEvent = event.events_in_thread && event.events_in_thread.length > 0;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hasContextSummary = Boolean(
    isThreadEvent && event.context_summary && String(event.context_summary).trim().length > 0
  );

  const summaryContent = hasContextSummary ? String(event.context_summary) : '';
  const originalContent = String(event.event_content || '');

  const renderWithLinks = (text) => {
    const parts = String(text || '').split(urlRegex);
    return parts.map((part, idx) =>
      idx % 2 === 1 ? (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  };

  return (
    <article className="card p-5 mb-4 shadow-card">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {profile_pic ? (
            <img
              src={profile_pic}
              alt={name || 'Profile'}
              className="w-11 h-11 rounded-full ring-2 ring-white dark:ring-gray-800 object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 ring-2 ring-white dark:ring-gray-800 flex items-center justify-center text-white font-semibold ${profile_pic ? 'hidden' : ''}`}
          >
            {name ? name.slice(0, 2).toUpperCase() : (npub ? npub.slice(4, 6).toUpperCase() : 'NP')}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {name || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {truncateNpub(npub)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(event.timestamp)}</p>
            </div>
            <div className="relative group" ref={reasonRef}>
              <div className={`pill ${scoreColor(score)} whitespace-nowrap flex items-center gap-1`}>
                Relevancy: {score}%
                {reason ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReason((v) => !v);
                    }}
                    className="ml-2 inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-400"
                    aria-label="Show relevancy reason"
                    title="Show relevancy reason"
                  >
                    Why ?
                  </button>
                ) : null}
              </div>
              {reason ? (
                <div
                  className={`absolute right-0 mt-1 z-20 w-72 max-w-[80vw] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-xs text-gray-700 dark:text-gray-200 shadow-lg ${showReason ? 'block' : 'hidden'} group-hover:block`}
                  role="tooltip"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">Why this score</div>
                    {model ? (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">Model: <span className="font-mono">{model}</span></div>
                    ) : null}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{reason}</div>
                  {!hideActions && onRerun ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRerun(event);
                        }}
                        className="btn-primary px-2 py-1 text-[11px]"
                      >
                        Rerun
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Original event content */}
          <div className="prose prose-sm dark:prose-invert max-w-none mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {renderWithLinks(originalContent)}
            </p>
          </div>

          {/* Context summary (if present) */}
          {hasContextSummary ? (
            <div className="mt-3 border border-dotted border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/30">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                LLM added context to this note
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {renderWithLinks(summaryContent)}
                </p>
              </div>
            </div>
          ) : null}

          {event?.event_id ? (
            <div className="mt-4">
              <a
                href={`https://njump.me/${event.event_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-1 text-xs"
              >
                Njump <span aria-hidden="true" className="text-[11px] leading-none">↗</span>
              </a>
            </div>
          ) : null}

        </div>
      </div>
      
    </article>
  );
};

export default EventCard;
