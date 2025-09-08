import React, { useState, useEffect, useRef } from 'react'
import { fetchFollowingForNpub } from '../lib/nostr'

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

export default function NewSummary({ allSummaries, onCreated }) {
  const [show, setShow] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [npubInput, setNpubInput] = useState(() => localStorage.getItem('user_npub') || '')
  const [sinceInput, setSinceInput] = useState('')
  const [instructionInput, setInstructionInput] = useState('Posts that contain useful information that educate me in someway or the other. Shitposting should be avoided. Low effort notes should be avoided.')
  const [lastSummaryMessage, setLastSummaryMessage] = useState('')
  const [followingLoading, setFollowingLoading] = useState(false)
  const [followingCount, setFollowingCount] = useState(null)
  const [prefetchedFollowing, setPrefetchedFollowing] = useState(null)
  const lastFetchedNpubRef = useRef('')
  const debounceTimerRef = useRef(null)

  const performFollowingFetch = async (npubToFetch) => {
    try {
      if (!npubToFetch) {
        setPrefetchedFollowing(null)
        setFollowingCount(null)
        return
      }
      setFollowingLoading(true)
      const list = await fetchFollowingForNpub(npubToFetch)
      // Ensure we apply only if npub hasn't changed since request started
      if (npubToFetch === npubInput) {
        setPrefetchedFollowing(Array.isArray(list) ? list : [])
        setFollowingCount(Array.isArray(list) ? list.length : 0)
        lastFetchedNpubRef.current = npubToFetch
      }
    } catch (e) {
      console.warn('Fetch following failed:', e)
      setPrefetchedFollowing([])
      setFollowingCount(0)
    } finally {
      setFollowingLoading(false)
    }
  }

  const open = async () => {
    const storedNpub = localStorage.getItem('user_npub')
    if (storedNpub) setNpubInput(storedNpub)

    const latest = allSummaries && allSummaries.length > 0 ? allSummaries[0] : null
    if (latest) {
      const latestTimestamp = parseInt(latest.timestamp)
      const dateObj = new Date(latestTimestamp * 1000)
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      const hours = String(dateObj.getHours()).padStart(2, '0')
      const minutes = String(dateObj.getMinutes()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`
      setSinceInput(formattedDate)
      setLastSummaryMessage(`Set to summarize since the last summary (${formatRelativeTime(latestTimestamp)})`)
    } else {
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
    setShow(true)

    // If we have an npub available, prefetch following list and show loading
    const npubToFetch = storedNpub || npubInput
    setFollowingCount(null)
    setPrefetchedFollowing(null)
    lastFetchedNpubRef.current = ''
    await performFollowingFetch(npubToFetch)
  }

  const close = () => setShow(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (npubInput) localStorage.setItem('user_npub', npubInput)

      const sinceTimestamp = Math.floor(new Date(sinceInput).getTime() / 1000)
      const currTimestamp = Math.floor(Date.now() / 1000)
      const summaryKey = `summary_${currTimestamp}`
      const summaryKeyParams = `summary_${currTimestamp}_params`

      localStorage.setItem(summaryKey, JSON.stringify({}))

      let followingNpubs = Array.isArray(prefetchedFollowing) ? prefetchedFollowing : []
      if (!Array.isArray(followingNpubs) || followingNpubs.length === 0) {
        try {
          followingNpubs = await fetchFollowingForNpub(npubInput)
        } catch (e) {
          console.warn('Failed to fetch following list:', e)
        }
      }

      const paramsData = {
        requestParams: {
          npub: npubInput,
          since: sinceTimestamp,
          curr_timestamp: currTimestamp,
          following_npubs: Array.isArray(followingNpubs) ? followingNpubs : [],
          following_count: Array.isArray(followingNpubs) ? followingNpubs.length : 0
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
        localStorage.setItem(summaryKey, JSON.stringify(responseData))
        if (onCreated) onCreated(summaryKey)
        setShow(false)
      } else {
        console.error('Failed to submit summary:', response.statusText)
      }
    } catch (error) {
      console.error('Error submitting summary:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Refetch following when npub changes while modal is open
  useEffect(() => {
    if (!show) return

    // Debounce to avoid firing on every keystroke
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (!npubInput) {
        setPrefetchedFollowing(null)
        setFollowingCount(null)
        lastFetchedNpubRef.current = ''
        setFollowingLoading(false)
        return
      }
      if (npubInput !== lastFetchedNpubRef.current) {
        performFollowingFetch(npubInput)
      }
    }, 400)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [npubInput, show])

  return (
    <>
      <button onClick={open} className="btn-primary px-3 py-1 text-sm">New Summary</button>
      {show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold">New Summary</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="npub" className="block text-sm font-medium mb-1">npub</label>
                <input id="npub" type="text" value={npubInput} onChange={(e) => setNpubInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter npub..." />
                {npubInput && (
                  <div className="mt-2">
                    {followingLoading ? (
                      <button className="btn-secondary px-3 py-1 text-xs inline-flex items-center gap-2" disabled>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Fetching following...
                      </button>
                    ) : (
                      followingCount !== null && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Following: {followingCount} accounts</p>
                      )
                    )}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="since" className="block text-sm font-medium mb-1">Summarize Since</label>
                <input id="since" type="datetime-local" value={sinceInput} onChange={(e) => setSinceInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                {lastSummaryMessage && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">{lastSummaryMessage}</p>
                )}
              </div>
              <div>
                <label htmlFor="instruction" className="block text-sm font-medium mb-1">Instruction</label>
                <textarea id="instruction" value={instructionInput} onChange={(e) => setInstructionInput(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={close} className="btn-secondary flex-1" disabled={isSubmitting}>Cancel</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? (
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
    </>
  )
}


