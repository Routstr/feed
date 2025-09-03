import { useEffect, useState } from 'react'
import JsonInput from './components/JsonInput'
import EventFeed from './components/EventFeed'
import { sampleData } from './data/sampleData'
import './index.css'

function App() {
  const [data, setData] = useState(null)
  const [dark, setDark] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  const handleDataLoad = (jsonData) => setData(jsonData)
  const loadSampleData = () => setData(sampleData)
  const clearData = () => setData(null)

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
            {!data && (
              <button onClick={loadSampleData} className="btn-primary">Load Sample</button>
            )}
            {data && (
              <button onClick={clearData} className="btn-secondary">Clear</button>
            )}
            <button onClick={() => setDark(v => !v)} className="btn-secondary" aria-label="Toggle theme">
              {dark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {!data ? (
          <JsonInput onDataLoad={handleDataLoad} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 order-2 lg:order-1">
              <EventFeed data={data} />
            </section>
            <aside className="order-1 lg:order-2">
              <div className="card p-4 mb-6">
                <h3 className="font-semibold mb-2">Feed Summary</h3>
                <ul className="space-y-3">
                  {data.output.map((o, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold">
                        {o.npub.slice(4,6).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.npub.slice(0, 12)}…{o.npub.slice(-8)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{o.events.length} events</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <JsonInput onDataLoad={handleDataLoad} />
            </aside>
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Built with Vite + React + Tailwind CSS
      </footer>
    </div>
  )
}

export default App
