import { useEffect, useState } from 'react'
import EventFeed from './components/EventFeed'
import { sampleData } from './data/sampleData'
import './index.css'

function App() {
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
      if (key && key.startsWith('summary_')) {
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
  const [npubInput, setNpubInput] = useState('')
  const [instructionInput, setInstructionInput] = useState('Posts that contain useful information that educate me in someway or the other. Shitposting should be avoided. Low effort notes should be avoided.')
  const [currTimestampInput, setCurrTimestampInput] = useState(() => Math.floor(Date.now() / 1000))
  const [sinceInput, setSinceInput] = useState(() => Math.floor(Date.now() / 1000) - (24 * 60 * 60))

  // Function to handle selecting a different summary
  const handleSummarySelect = (summaryKey) => {
    const selectedSummary = allSummaries.find(s => s.key === summaryKey)
    if (selectedSummary) {
      setData(selectedSummary.data)
      setCurrentSummaryKey(summaryKey)
    }
  }

  // Function to refresh summaries list (useful when new summaries are added)
  const refreshSummaries = () => {
    const updatedSummaries = loadAllSummaries()
    setAllSummaries(updatedSummaries)
  }

  // New Summary modal handlers
  const handleNewSummary = () => {
    // Reset timestamp inputs to current values when opening modal
    setCurrTimestampInput(Math.floor(Date.now() / 1000))
    setSinceInput(Math.floor(Date.now() / 1000) - (24 * 60 * 60))
    setShowSummaryModal(true)
  }

  const handleCloseModal = () => {
    setShowSummaryModal(false)
  }

  const handleSubmitSummary = async () => {
    setIsSubmittingSummary(true)
    try {
      // Store empty JSON before request to mark initiation
      const summaryKey = `summary_${currTimestampInput}`
      localStorage.setItem(summaryKey, JSON.stringify({}))
      
      console.log('Making POST request to https://6d8ea891e9b2.ngrok-free.app/run')
      
      const response = await fetch('https://6d8ea891e9b2.ngrok-free.app/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          npub: npubInput,
          since: sinceInput,
          curr_timestamp: currTimestampInput
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
                <h3 className="font-semibold">Stored Summaries</h3>
                <button
                  onClick={refreshSummaries}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  title="Refresh summaries list"
                >
                  Refresh
                </button>
              </div>
              {allSummaries.length > 0 ? (
                <ul className="space-y-2">
                  {allSummaries.map((summary) => (
                    <li key={summary.key}>
                      <button
                        onClick={() => handleSummarySelect(summary.key)}
                        disabled={summary.isLoading}
                        className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                          summary.isLoading
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 cursor-wait opacity-75'
                            : currentSummaryKey === summary.key
                            ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate flex items-center gap-2">
                            Summary {summary.timestamp.slice(-6)}
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
                            Loading...
                          </div>
                        ) : summary.data.output ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {summary.data.output.reduce((acc, o) => acc + o.events.length, 0)} events
                          </div>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
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
                <label htmlFor="curr_timestamp" className="block text-sm font-medium mb-1">
                  Current Timestamp
                </label>
                <input
                  id="curr_timestamp"
                  type="number"
                  value={currTimestampInput}
                  onChange={(e) => setCurrTimestampInput(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="since" className="block text-sm font-medium mb-1">
                  Since Timestamp
                </label>
                <input
                  id="since"
                  type="number"
                  value={sinceInput}
                  onChange={(e) => setSinceInput(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
