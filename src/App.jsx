import { useEffect, useState } from 'react'
import EventFeed from './components/EventFeed'
import { sampleData } from './data/sampleData'
import './index.css'

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

  // New Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [isSubmittingSummary, setIsSubmittingSummary] = useState(false)
  const [retryingSummaryKey, setRetryingSummaryKey] = useState(null)
  const [npubInput, setNpubInput] = useState(() => {
    // Load npub from localStorage on initial mount
    return localStorage.getItem('user_npub') || ''
  })
  // State for collapsible summaries list on mobile
  const [summariesExpanded, setSummariesExpanded] = useState(false)
  const [instructionInput, setInstructionInput] = useState('Posts that contain useful information that educate me in someway or the other. Shitposting should be avoided. Low effort notes should be avoided.')
  const [sinceInput, setSinceInput] = useState('')
  const [lastSummaryMessage, setLastSummaryMessage] = useState('')

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
      
      console.log('Retrying POST request to https://6d8ea891e9b2.ngrok-free.app/run')
      
      const response = await fetch('https://6d8ea891e9b2.ngrok-free.app/run', {
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

  // New Summary modal handlers
  const handleNewSummary = () => {
    // Load stored npub if available
    const storedNpub = localStorage.getItem('user_npub')
    if (storedNpub) {
      setNpubInput(storedNpub)
    }
    
    // Get the latest summary timestamp if available
    const latestSummary = allSummaries.length > 0 ? allSummaries[0] : null
    
    if (latestSummary) {
      // Set since to the latest summary's timestamp
      const latestTimestamp = parseInt(latestSummary.timestamp)
      const dateObj = new Date(latestTimestamp * 1000)
      // Format as datetime-local input value (YYYY-MM-DDTHH:mm)
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      const hours = String(dateObj.getHours()).padStart(2, '0')
      const minutes = String(dateObj.getMinutes()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`
      setSinceInput(formattedDate)
      setLastSummaryMessage(`Set to summarize since the last summary (${formatRelativeTime(latestTimestamp)})`)
    } else {
      // Default to 24 hours ago if no summaries exist
      const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000))
      const year = yesterday.getFullYear()
      const month = String(yesterday.getMonth() + 1).padStart(2, '0')
      const day = String(yesterday.getDate()).padStart(2, '0')
      const hours = String(yesterday.getHours()).padStart(2, '0')
      const minutes = String(yesterday.getMinutes()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`
      setSinceInput(formattedDate)
      setLastSummaryMessage('')
    }
    setShowSummaryModal(true)
  }

  const handleCloseModal = () => {
    setShowSummaryModal(false)
  }

  const handleSubmitSummary = async () => {
    setIsSubmittingSummary(true)
    try {
      // Store the npub in localStorage for future use
      if (npubInput) {
        localStorage.setItem('user_npub', npubInput)
      }
      
      // Convert datetime-local input to timestamp
      const sinceTimestamp = Math.floor(new Date(sinceInput).getTime() / 1000)
      const currTimestamp = Math.floor(Date.now() / 1000)
      
      // Create both keys: main summary key and params key
      const summaryKey = `summary_${currTimestamp}`
      const summaryKeyParams = `summary_${currTimestamp}_params`
      
      // Store loading state in main summary key
      const loadingData = {}
      localStorage.setItem(summaryKey, JSON.stringify(loadingData))
      
      // Store request parameters in params key
      const paramsData = {
        requestParams: {
          npub: npubInput,
          since: sinceTimestamp,
          curr_timestamp: currTimestamp
        }
      }
      localStorage.setItem(summaryKeyParams, JSON.stringify(paramsData))
      
      console.log('Making POST request to https://6d8ea891e9b2.ngrok-free.app/run')
      
      const response = await fetch('https://6d8ea891e9b2.ngrok-free.app/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          npub: npubInput,
          since: sinceTimestamp,
          curr_timestamp: currTimestamp
        })
      })
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('Response received:', responseData)
        
        // Store the actual response data
        localStorage.setItem(summaryKey, JSON.stringify(responseData))
        
        // Refresh summaries list and load new summary
        refreshSummaries()
        const updatedSummaries = loadAllSummaries()
        const newSummary = updatedSummaries.find(s => s.key === summaryKey)
        if (newSummary) {
          setData(newSummary.data)
          setCurrentSummaryKey(summaryKey)
        }
        
        setShowSummaryModal(false)
      } else {
        console.error('Failed to submit summary:', response.statusText)
      }
    } catch (error) {
      console.error('Error submitting summary:', error)
    } finally {
      setIsSubmittingSummary(false)
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
              <h1 className="text-lg font-bold">Nostr Events Feed</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Twitter-like UI with relevancy scoring</p>
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
            <EventFeed data={data} />
          </section>
          <aside className="order-1 lg:order-2">
            {/* New Summary Button */}
            <button
              onClick={handleNewSummary}
              className="btn-primary w-full mb-4"
            >
              New Summary
            </button>

            <div className="card p-4 mb-6">
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
                                {!summary.isLoading && currentSummaryKey === summary.key && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400">●</span>
                                )}
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
                            {!summary.isLoading && currentSummaryKey === summary.key && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">●</span>
                            )}
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

      {/* New Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">New Summary</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="npub" className="block text-sm font-medium mb-1">
                  npub
                </label>
                <input
                  id="npub"
                  type="text"
                  value={npubInput}
                  onChange={(e) => setNpubInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter npub..."
                />
              </div>

              <div>
                <label htmlFor="since" className="block text-sm font-medium mb-1">
                  Summarize Since
                </label>
                <input
                  id="since"
                  type="datetime-local"
                  value={sinceInput}
                  onChange={(e) => setSinceInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {lastSummaryMessage && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    {lastSummaryMessage}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="instruction" className="block text-sm font-medium mb-1">
                  Instruction
                </label>
                <textarea
                  id="instruction"
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCloseModal}
                className="btn-secondary flex-1"
                disabled={isSubmittingSummary}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitSummary}
                disabled={isSubmittingSummary}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingSummary ? (
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
