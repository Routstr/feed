import { useEffect, useState } from 'react'
import EventFeed from './components/EventFeed'
import { sampleData } from './data/sampleData'
import './index.css'
import NewSummary from './components/NewSummary'
import EventCard from './components/EventCard'

function App() {
  // Function to format timestamp as relative time
  const formatRelativeTime = (timestamp) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - parseInt(timestamp)
    
    if (diff < 60) return 'just now'
    if (diff < 3600) {
      const minutes = Math.floor(diff / 60)
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600)
      return `${hours}${hours === 1 ? ' hour' : ' hours'} ago`
    }
    if (diff < 604800) {
      const days = Math.floor(diff / 86400)
      if (days === 1) return '1 day ago'
      if (days < 2) {
        const hours = Math.floor((diff % 86400) / 3600)
        if (hours > 0) return `1.5 days ago`
        return '1 day ago'
      }
      return `${days} days ago`
    }
    if (diff < 2592000) {
      const weeks = Math.floor(diff / 604800)
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
    }
    const months = Math.floor(diff / 2592000)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }

  // Function to detect if a summary is in loading state
  const isLoadingSummary = (data) => {
    // Empty object {} indicates loading
    if (!data || Object.keys(data).length === 0) {
      return true
    }
    // Check if data has proper output structure
    return !data.output || !Array.isArray(data.output)
  }

  // Function to load all summaries from localStorage
  const loadAllSummaries = () => {
    const summaries = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('summary_') && !key.endsWith('_params')) {
        try {
          const storedData = JSON.parse(localStorage.getItem(key))
          // Include all summaries, both loading and completed
          if (storedData !== null) {
            const timestamp = key.replace('summary_', '')
            summaries.push({
              key,
              timestamp,
              data: storedData,
              date: new Date(parseInt(timestamp) * 1000).toLocaleString(),
              isLoading: isLoadingSummary(storedData)
            })
          }
        } catch (error) {
          console.warn(`Failed to parse stored summary with key ${key}:`, error)
        }
      }
    }
    // Sort by timestamp (newest first)
    return summaries.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
  }

  const [allSummaries, setAllSummaries] = useState(loadAllSummaries)
  const [data, setData] = useState(() => {
    // If any summaries exist, load the first one; otherwise use sampleData
    if (allSummaries.length > 0) {
      console.log(`Loading stored summary data (${allSummaries.length} summaries found)`)
      return allSummaries[0].data
    } else {
      console.log('No stored summaries found, using sample data')
      return sampleData
    }
  })
  const [currentSummaryKey, setCurrentSummaryKey] = useState(() => {
    return allSummaries.length > 0 ? allSummaries[0].key : null
  })
  const [dark, setDark] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Retry state
  const [retryingSummaryKey, setRetryingSummaryKey] = useState(null)
  // State for collapsible summaries list on mobile
  const [summariesExpanded, setSummariesExpanded] = useState(false)

  // Rerun modal state
  const [rerunOpen, setRerunOpen] = useState(false)
  const [rerunEvent, setRerunEvent] = useState(null)
  const [rerunInstruction, setRerunInstruction] = useState('')
  const [rerunSubmitting, setRerunSubmitting] = useState(false)

  // Function to handle selecting a different summary or retrying a loading summary
  const handleSummarySelect = async (summaryKey) => {
    const selectedSummary = allSummaries.find(s => s.key === summaryKey)
    if (!selectedSummary) return

    // If summary is loading, retry the request
    if (selectedSummary.isLoading) {
      await handleRetrySummary(summaryKey)
      return
    }

    // Otherwise, just load the summary
    setData(selectedSummary.data)
    setCurrentSummaryKey(summaryKey)
  }

  // Function to retry loading a summary
  const handleRetrySummary = async (summaryKey) => {
    setRetryingSummaryKey(summaryKey)
    try {
      // Get the stored params data which should contain original request params
      const timestamp = summaryKey.replace('summary_', '')
      const paramsKey = `summary_${timestamp}_params`
      const storedParams = JSON.parse(localStorage.getItem(paramsKey))
      
      // If no request params stored, we can't retry
      if (!storedParams || !storedParams.requestParams) {
        console.error('No request parameters found for retry')
        return
      }

      const { npub, since, curr_timestamp } = storedParams.requestParams

      // Ensure following list is present; if missing, fetch and update params
      try {
        const existingFollowing = storedParams.requestParams.following_npubs || []
        if (!Array.isArray(existingFollowing) || existingFollowing.length === 0) {
          const refreshedFollowing = await fetchFollowingForNpub(npub)
          storedParams.requestParams.following_npubs = refreshedFollowing
          storedParams.requestParams.following_count = Array.isArray(refreshedFollowing) ? refreshedFollowing.length : 0
          localStorage.setItem(paramsKey, JSON.stringify(storedParams))
        }
      } catch (e) {
        console.warn('Failed to refresh following list on retry:', e)
      }
      
      console.log('Retrying POST request to https://33c01492b8f6.ngrok-free.app/run')
      
      const response = await fetch('https://33c01492b8f6.ngrok-free.app/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          npub: npub,
          since: since,
          curr_timestamp: curr_timestamp
        })
      })
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('Retry response received:', responseData)
        
        // Store the actual response data
        localStorage.setItem(summaryKey, JSON.stringify(responseData))
        
        // Refresh summaries list and load the updated summary
        refreshSummaries()
        const updatedSummaries = loadAllSummaries()
        const updatedSummary = updatedSummaries.find(s => s.key === summaryKey)
        if (updatedSummary) {
          setData(updatedSummary.data)
          setCurrentSummaryKey(summaryKey)
        }
      } else {
        console.error('Failed to retry summary:', response.statusText)
      }
    } catch (error) {
      console.error('Error retrying summary:', error)
    } finally {
      setRetryingSummaryKey(null)
    }
  }

  // Function to refresh summaries list (useful when new summaries are added)
  const refreshSummaries = () => {
    const updatedSummaries = loadAllSummaries()
    setAllSummaries(updatedSummaries)
  }

  // Open rerun modal for an event
  const handleOpenRerun = (event) => {
    setRerunEvent(event)
    const storedInstruction = localStorage.getItem('user_instruction')
    setRerunInstruction(storedInstruction && storedInstruction.trim() !== '' ? storedInstruction : '')
    setRerunOpen(true)
  }

  // Submit rerun request
  const handleSubmitRerun = async () => {
    if (!rerunEvent) return
    setRerunSubmitting(true)
    try {
      const response = await fetch('https://e85c283972d3.ngrok-free.app/rerun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          event_content: rerunEvent.event_content || '',
          instruction: rerunInstruction || ''
        })
      })
      if (!response.ok) {
        console.error('Failed to rerun event:', response.statusText)
        return
      }
      const result = await response.json()
      console.log('Rerun result:', result)

      // Update this event's relevancy and reason in current summary data and localStorage
      setData(prev => {
        try {
          const draft = JSON.parse(JSON.stringify(prev))
          if (draft && Array.isArray(draft.output)) {
            for (const out of draft.output) {
              if (!Array.isArray(out.events)) continue
              const idx = out.events.findIndex(ev => ev.event_id === rerunEvent.event_id)
              if (idx !== -1) {
                if (typeof result.relevancy_score !== 'undefined') {
                  out.events[idx].relevancy_score = result.relevancy_score
                }
                if (typeof result.reason_for_score !== 'undefined') {
                  out.events[idx].reason_for_score = result.reason_for_score
                }
                break
              }
            }
          }
          // Persist to localStorage if a summary key is selected
          if (currentSummaryKey) {
            localStorage.setItem(currentSummaryKey, JSON.stringify(draft))
            refreshSummaries()
          }
          return draft
        } catch (e) {
          console.warn('Failed to update event after rerun:', e)
          return prev
        }
      })
      setRerunOpen(false)
      setRerunEvent(null)
    } catch (e) {
      console.error('Error during rerun:', e)
    } finally {
      setRerunSubmitting(false)
    }
  }

  // Function to delete a summary (with confirmation)
  const handleDeleteSummary = (summaryKey) => {
    const confirmed = window.confirm('Delete this summary? This cannot be undone.')
    if (!confirmed) return
    try {
      const timestamp = summaryKey.replace('summary_', '')
      const paramsKey = `summary_${timestamp}_params`

      // Remove stored summary and its params
      localStorage.removeItem(summaryKey)
      localStorage.removeItem(paramsKey)

      // Refresh list
      const updatedSummaries = loadAllSummaries()
      setAllSummaries(updatedSummaries)

      // If the deleted one was selected, choose a new selection
      if (currentSummaryKey === summaryKey) {
        if (updatedSummaries.length > 0) {
          setData(updatedSummaries[0].data)
          setCurrentSummaryKey(updatedSummaries[0].key)
        } else {
          setData(sampleData)
          setCurrentSummaryKey(null)
        }
      }
    } catch (error) {
      console.error('Error deleting summary:', error)
    }
  }


  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-gray-900/60 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600"></div>
            <div>
              <h1 className="text-lg font-bold">Goose Powered Feed</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Consume Content like a Pro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(v => !v)} className="btn-secondary" aria-label="Toggle theme">
              {dark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 order-2 lg:order-1">
            <EventFeed data={data} onRerun={handleOpenRerun} />
          </section>
          <aside className="order-1 lg:order-2">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setSummariesExpanded(!summariesExpanded)}
                  className="flex items-center gap-2 font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors lg:pointer-events-none"
                >
                  <h3>Stored Summaries</h3>
                  <svg
                    className={`w-4 h-4 transition-transform lg:hidden ${summariesExpanded ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {/* New Summary */}
                <NewSummary
                  allSummaries={allSummaries}
                  onCreated={(summaryKey) => {
                    refreshSummaries()
                    const updatedSummaries = loadAllSummaries()
                    const newSummary = updatedSummaries.find(s => s.key === summaryKey)
                    if (newSummary) {
                      setData(newSummary.data)
                      setCurrentSummaryKey(summaryKey)
                    }
                  }}
                />
              </div>
              {allSummaries.length > 0 ? (
                <>
                  {/* Always show the latest summary */}
                  {allSummaries.length > 0 && (
                    <div className="mb-2">
                      {(() => {
                        const summary = allSummaries[0];
                        return (
                          <div
                            className={`relative p-2 rounded-md text-sm transition-colors ${
                              summary.isLoading
                                ? retryingSummaryKey === summary.key
                                  ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                : currentSummaryKey === summary.key
                                ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                            }`}
                          >
                            <button
                              onClick={() => handleSummarySelect(summary.key)}
                              disabled={retryingSummaryKey === summary.key}
                              className="w-full text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate flex items-center gap-2">
                                  Summary {formatRelativeTime(summary.timestamp)}
                                  {summary.isLoading && (
                                    <span className="inline-flex items-center">
                                      <svg className="animate-spin h-3 w-3 text-yellow-600 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    </span>
                                  )}
                                </span>
                                
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {summary.date}
                              </div>
                              {summary.isLoading ? (
                                <div className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                                  {retryingSummaryKey === summary.key ? 'Retrying...' : 'Loading... (click to retry)'}
                                </div>
                              ) : summary.data.output ? (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {summary.data.output.reduce((acc, o) => acc + o.events.length, 0)} events
                                </div>
                              ) : null}
                            </button>
                            
                            {/* Refetch button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRetrySummary(summary.key)
                              }}
                              disabled={retryingSummaryKey === summary.key}
                              className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Refetch summary"
                            >
                              {retryingSummaryKey === summary.key ? (
                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              )}
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSummary(summary.key)
                              }}
                              className="absolute top-2 right-8 p-1 rounded-md text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Delete summary"
                            >
                              <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                              </svg>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Show remaining summaries when expanded (or always on desktop) */}
                  {allSummaries.length > 1 && (
                    <div className={`${summariesExpanded ? 'block' : 'hidden'} lg:block`}>
                      <ul className="space-y-2">
                        {allSummaries.slice(1).map((summary) => (
                          <li key={summary.key}>
                      <div
                        className={`relative p-2 rounded-md text-sm transition-colors ${
                          summary.isLoading
                            ? retryingSummaryKey === summary.key
                              ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                            : currentSummaryKey === summary.key
                            ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                        }`}
                      >
                        <button
                          onClick={() => handleSummarySelect(summary.key)}
                          disabled={retryingSummaryKey === summary.key}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate flex items-center gap-2">
                              Summary {formatRelativeTime(summary.timestamp)}
                              {summary.isLoading && (
                                <span className="inline-flex items-center">
                                  <svg className="animate-spin h-3 w-3 text-yellow-600 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </span>
                              )}
                            </span>
                            
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {summary.date}
                          </div>
                          {summary.isLoading ? (
                            <div className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                              {retryingSummaryKey === summary.key ? 'Retrying...' : 'Loading... (click to retry)'}
                            </div>
                          ) : summary.data.output ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {summary.data.output.reduce((acc, o) => acc + o.events.length, 0)} events
                            </div>
                          ) : null}
                        </button>
                        
                        {/* Refetch button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetrySummary(summary.key)
                          }}
                          disabled={retryingSummaryKey === summary.key}
                          className="absolute top-2 right-2 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refetch summary"
                        >
                          {retryingSummaryKey === summary.key ? (
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSummary(summary.key)
                          }}
                          className="absolute top-2 right-8 p-1 rounded-md text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete summary"
                        >
                          <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No stored summaries found.
                  <br />
                  <span className="text-xs">Create a new summary to see it here.</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Built with Vite + React + Tailwind CSS
      </footer>

      {/* New Summary Modal moved to component */}

      {/* Rerun Modal */}
      {rerunOpen && rerunEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">Rerun Scoring</h2>
              <button onClick={() => setRerunOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {/* Preview the event card */}
              <EventCard event={rerunEvent} npub={rerunEvent.npub} name={rerunEvent.name} profile_pic={rerunEvent.profile_pic} hideActions onRerun={null} model={data?.model || (typeof window !== 'undefined' ? (localStorage.getItem('user_model') || null) : null)} />
              <div>
                <label htmlFor="rerun-instruction" className="block text-sm font-medium mb-1">Instruction</label>
                <textarea
                  id="rerun-instruction"
                  value={rerunInstruction}
                  onChange={(e) => setRerunInstruction(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setRerunOpen(false)} className="btn-secondary flex-1" disabled={rerunSubmitting}>Cancel</button>
              <button onClick={handleSubmitRerun} disabled={rerunSubmitting} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {rerunSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
