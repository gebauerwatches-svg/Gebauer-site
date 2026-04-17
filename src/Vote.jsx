import { useState, useEffect } from 'react'
import logo from './assets/gebauer-logo.svg'
import './Vote.css'

// Active poll - update this when you want to change the question
const ACTIVE_POLL = {
  id: 'raven-caseback-style',
  question: "We're deciding on the raven caseback. Which direction should we go?",
  context: "The raven is Huginn, one of Odin's ravens from Norse mythology. It gets engraved on the back of every watch, right below the edition number. You'll see it every time you take the watch off.",
  options: [
    { id: 'detailed', label: 'Detailed', desc: 'Realistic feather texture and depth. Intricate.' },
    { id: 'simplified', label: 'Simplified', desc: 'Clean lines, almost abstract. Bold silhouette.' },
    { id: 'minimal', label: 'Minimal', desc: 'Just the outline. Subtle and understated.' },
  ],
  closesAt: null, // set a date string to auto-close, or null for manual
}

// Past polls - move completed polls here to show results
const PAST_POLLS = [
  // {
  //   id: 'example',
  //   question: 'Which wood would you pick?',
  //   results: { padauk: 45, ebony: 38, hinoki: 29 },
  //   winner: 'padauk',
  //   total: 112,
  // },
]

export default function Vote() {
  const [voted, setVoted] = useState(() => localStorage.getItem(`gebauer_vote_${ACTIVE_POLL.id}`) || '')
  const [results, setResults] = useState({})
  const [totalVotes, setTotalVotes] = useState(0)
  const [showResults, setShowResults] = useState(!!voted)

  // Load results on mount
  useEffect(() => {
    const saved = localStorage.getItem(`gebauer_results_${ACTIVE_POLL.id}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      setResults(parsed)
      setTotalVotes(Object.values(parsed).reduce((a, b) => a + b, 0))
    }
  }, [])

  const handleVote = (optionId) => {
    if (voted) return

    const newResults = { ...results }
    newResults[optionId] = (newResults[optionId] || 0) + 1
    const newTotal = Object.values(newResults).reduce((a, b) => a + b, 0)

    setResults(newResults)
    setTotalVotes(newTotal)
    setVoted(optionId)
    setShowResults(true)

    localStorage.setItem(`gebauer_vote_${ACTIVE_POLL.id}`, optionId)
    localStorage.setItem(`gebauer_results_${ACTIVE_POLL.id}`, JSON.stringify(newResults))

    // Try to save to Supabase via API (fire and forget)
    fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poll_id: ACTIVE_POLL.id, option: optionId }),
    }).catch(() => {})
  }

  const getPercent = (optionId) => {
    if (totalVotes === 0) return 0
    return Math.round(((results[optionId] || 0) / totalVotes) * 100)
  }

  return (
    <div className="vote-page">
      <header className="vote-header">
        <a href="/" className="vote-home"><img src={logo} alt="Gebauer" className="vote-logo" /></a>
      </header>

      <div className="vote-main">
        <p className="vote-label">Design Input</p>
        <h1 className="vote-question">{ACTIVE_POLL.question}</h1>
        <p className="vote-context">{ACTIVE_POLL.context}</p>

        <div className="vote-options">
          {ACTIVE_POLL.options.map(opt => {
            const pct = getPercent(opt.id)
            const isWinner = showResults && pct === Math.max(...ACTIVE_POLL.options.map(o => getPercent(o.id)))
            const isSelected = voted === opt.id

            return (
              <button
                key={opt.id}
                className={`vote-option ${isSelected ? 'selected' : ''} ${showResults ? 'revealed' : ''} ${isWinner ? 'winner' : ''}`}
                onClick={() => handleVote(opt.id)}
                disabled={!!voted}
              >
                <div className="vote-option-content">
                  <h3 className="vote-option-label">{opt.label}</h3>
                  <p className="vote-option-desc">{opt.desc}</p>
                </div>
                {showResults && (
                  <div className="vote-option-result">
                    <div className="vote-bar-bg">
                      <div className="vote-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="vote-pct">{pct}%</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {showResults && (
          <p className="vote-total">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} so far</p>
        )}

        {!voted && (
          <p className="vote-hint">Your vote shapes the final design. Pick one.</p>
        )}

        {voted && (
          <div className="vote-thanks">
            <p>Your vote is in. Results update live.</p>
            <p className="vote-check-back">Check back to see how the community votes.</p>
          </div>
        )}
      </div>

      {PAST_POLLS.length > 0 && (
        <div className="vote-past">
          <h2 className="vote-past-title">Past Polls</h2>
          {PAST_POLLS.map(poll => (
            <div key={poll.id} className="vote-past-card">
              <h3>{poll.question}</h3>
              <p className="vote-past-winner">Winner: {poll.winner} ({poll.total} votes)</p>
            </div>
          ))}
        </div>
      )}

      <footer className="vote-footer">
        <a href="/">gebauerwatches.com</a>
        <span> · </span>
        <a href="/blog">Blog</a>
      </footer>
    </div>
  )
}
