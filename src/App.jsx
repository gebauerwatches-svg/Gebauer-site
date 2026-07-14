import { useState, useEffect, useRef } from 'react'
import logo from './assets/gebauer-logo.svg'
import kitchenTable from './assets/kitchen-table.jpeg'
import watchEbony from './assets/tokiji-ebony-render.jpeg'
import ravenSimple from './assets/raven-simple.png'
import ravenMinimal from './assets/raven-minimal.png'
import claspButterfly from './assets/polls/clasp-butterfly.png'
import claspDeployed from './assets/polls/clasp-deployed.png'
import boxDebossed from './assets/polls/box-debossed.png'
import boxGoldLogo from './assets/polls/box-gold-logo.png'
import interiorSuede from './assets/polls/interior-suede.jpeg'
import interiorMicrofiber from './assets/polls/interior-microfiber.jpeg'
import watchHinoki from './assets/tokiji-hinoki-render.jpeg'
import watchPadauk from './assets/tokiji-padauk-render.jpeg'
import padaukAged from './assets/padauk-aged.jpeg'
import padaukDeep from './assets/padauk-deep.jpeg'
import milanBg from './assets/milan.jpeg'
import './App.css'

// Map poll option text to images
const POLL_IMAGES = {
  'Matte Black with Debossed Logo': { img: boxDebossed, desc: 'Clean, subtle. The logo is pressed into the material.' },
  'Matte Black with Gold Logo': { img: boxGoldLogo, desc: 'Bold. Gold foil on matte black.' },
  'Suede': { img: interiorSuede, desc: 'Soft, textured, premium feel. Used in high-end jewelry boxes.' },
  'Microfiber': { img: interiorMicrofiber, desc: 'Smooth, modern, easy to clean. Common in watch boxes.' },
  'Butterfly Clasp': { img: claspButterfly, desc: 'Folds flat. Sleek and secure.' },
  'Deployant Clasp': { img: claspDeployed, desc: 'Opens wider. Easy on, easy off.' },
}

// Raven Path referral system removed June 21 2026 per the brand pivot away
// from gamified referrals. Numbers (1-300) are now reserved intentionally
// by Liam, not earned through referrals. Historical referral_count data
// preserved in D1 but the UI no longer displays it.

const FALLBACK_WAITLIST_COUNT = 152

// Wood choices for the insider vote card. Matches the wood vote API which
// expects lowercase keys (padauk, ebony, hinoki). Images use the existing
// Tokiji render imports at the top of this file.
const WOOD_OPTIONS = [
  { key: 'padauk', label: 'Padauk', img: watchPadauk },
  { key: 'ebony',  label: 'Ebony',  img: watchEbony },
  { key: 'hinoki', label: 'Hinoki', img: watchHinoki },
]

const RavenIcon = ({ className = '', size = 20 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C10.5 2 9 3 8.5 4.5C7 4 5 4.5 4 6C3 7.5 3.5 9.5 4.5 10.5C3 11.5 2 13.5 2.5 15.5C3 17.5 5 19 7 19L8 21H16L17 19C19 19 21 17.5 21.5 15.5C22 13.5 21 11.5 19.5 10.5C20.5 9.5 21 7.5 20 6C19 4.5 17 4 15.5 4.5C15 3 13.5 2 12 2ZM10 9C10.6 9 11 9.4 11 10S10.6 11 10 11S9 10.6 9 10S9.4 9 10 9ZM14 9C14.6 9 15 9.4 15 10S14.6 11 14 11S13 10.6 13 10S13.4 9 14 9Z"/>
  </svg>
)

function useScrollReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('revealed'); observer.unobserve(el) }
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function Reveal({ as: Tag = 'section', className = '', children, ...props }) {
  const ref = useScrollReveal()
  return <Tag ref={ref} className={`reveal ${className}`} {...props}>{children}</Tag>
}


/**
 * Insider view (Layer 2): what a signed-in subscriber sees.
 * Three cards: greeting + timeline, active poll, latest journal posts.
 * Built to feel like an insider page, not a confirmation screen.
 */
function InsiderView({ firstName, onBack }) {
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  // Timeline is editable from /admin (Timeline view). Falls back to the default in /api/timeline if D1 row missing.
  const [timeline, setTimeline] = useState([
    { id: 'design',      label: 'Design locked',         when: 'June 2026',     status: 'done' },
    { id: 'samples',     label: 'Samples arrive',        when: 'August 2026',   status: 'current' },
    { id: 'kickstarter', label: 'Kickstarter launches',  when: 'November 2026', status: 'upcoming' },
    { id: 'ship',        label: 'Watches ship',          when: 'Early 2027',    status: 'upcoming' },
  ])

  // Per-milestone-id thumbnail. Admin edits text only; the image is resolved client-side.
  const milestoneImage = (id) => (id === 'design' ? watchPadauk : null)

  useEffect(() => {
    fetch('/api/journal')
      .then(r => r.json())
      .then(d => {
        if (d.posts) setPosts(d.posts)
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false))

    fetch('/api/timeline')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.milestones) && d.milestones.length > 0) setTimeline(d.milestones)
      })
      .catch(() => {})
  }, [])

  // Format a Substack pubDate (e.g. "Sat, 21 Jun 2026 10:00:00 GMT") into "Jun 21"
  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="l2">
      <header className="l2-welcome">
        <img src={logo} alt="Gebauer" className="l2-logo" />
        <h1 className="l2-rank-hero fade-in">
          You're in, {firstName}.
        </h1>
        <p className="l2-rank-detail fade-in-delay-1">
          One of the first to know about Gebauer.
        </p>
      </header>

      {/* CARD 1 - Visual timeline */}
      <section className="l2-card fade-in-delay-1">
        <p className="l2-section-label">The road to launch</p>
        <ol className="l2-timeline">
          {timeline.map((m) => (
            <li key={m.id} className={`l2-timeline-step l2-timeline-${m.status}`}>
              <div className="l2-timeline-dot" aria-hidden="true">
                {m.status === 'done' && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="l2-timeline-text">
                <div className="l2-timeline-label">{m.label}</div>
                <div className="l2-timeline-when">{m.when}</div>
              </div>
              {milestoneImage(m.id) && (
                <img src={milestoneImage(m.id)} alt="" className="l2-timeline-thumb" />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Rotating polls + wood vote removed July 2 2026 per founder call.
          Replaced with reservation CTA: insiders who want a specific
          number now have a direct path to reserve one instead of just
          voting on wood variants. */}

      {/* CARD 2 - Reserve a watch */}
      <section className="l2-card l2-reserve-card fade-in-delay-2" style={{ textAlign: 'center' }}>
        <p className="l2-section-label">Ready to reserve one?</p>
        <p className="l2-poll-question" style={{ marginBottom: 20 }}>
          Watch numbers are assigned personally, not by queue. If you have a specific number in mind, or want to lock in a wood before the Kickstarter launches, start here.
        </p>
        <a
          href="/reserve"
          className="l2-substack-btn"
          style={{ display: 'inline-block', textDecoration: 'none' }}
        >
          Reserve a watch
        </a>
        <p style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
          Costs nothing. Doesn't commit you. Just starts a conversation with me.
        </p>
      </section>

      {/* CARD 3 - Latest from the journal */}
      <section className="l2-card fade-in-delay-2">
        <p className="l2-section-label">From the journal</p>
        {postsLoading ? (
          <p className="l2-journal-loading">Loading recent posts...</p>
        ) : posts.length === 0 ? (
          <p className="l2-journal-loading">No posts yet. First entries land soon.</p>
        ) : (
          <>
            <ul className="l2-journal-list">
              {posts.slice(0, 2).map(p => (
                <li key={p.url} className={`l2-journal-item ${p.image ? 'has-img' : ''}`}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    {p.image && (
                      <img src={p.image} alt="" className="l2-journal-thumb" loading="lazy" />
                    )}
                    <div className="l2-journal-text">
                      <span className="l2-journal-date">{formatDate(p.published_at)}</span>
                      <span className="l2-journal-title">{p.title}</span>
                      <span className="l2-journal-snippet">{p.snippet}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
            <a className="l2-substack-btn" href="https://gebauerwatches.substack.com" target="_blank" rel="noopener noreferrer">
              Read the full journal
            </a>
          </>
        )}
      </section>

      <footer className="l2-footer">
        <button className="l2-back" onClick={onBack}>Back to home</button>
        <p>&copy; {new Date().getFullYear()} Gebauer Watches</p>
      </footer>
    </div>
  )
}


function App() {
  const [layer, setLayer] = useState('landing')
  const [showSignup, setShowSignup] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [showStats, setShowStats] = useState(false)
  // Last-used email is remembered as autofill suggestion only. Does NOT
  // auto-load identity (per the June 21 2026 localStorage fix).
  const [statsEmail, setStatsEmail] = useState(() => localStorage.getItem('gebauer_last_email') || '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState(FALLBACK_WAITLIST_COUNT)

  // Voting system — saves to Supabase via API
  const [woodVote, setWoodVote] = useState(() => localStorage.getItem('gebauer_wood_vote') || '')
  const [woodSubmitted, setWoodSubmitted] = useState(() => localStorage.getItem('gebauer_wood_submitted') === 'true')
  const [woodResults, setWoodResults] = useState({})

  // Rotating polls system
  const [activePoll, setActivePoll] = useState(null)
  const [lastPollResult, setLastPollResult] = useState(null)
  const [pollVote, setPollVote] = useState('')
  const [pollSubmitted, setPollSubmitted] = useState(false)
  const [pollGated, setPollGated] = useState(false)
  const [milestoneStory, setMilestoneStory] = useState('')
  const [hasSubmittedStory, setHasSubmittedStory] = useState(() => localStorage.getItem('gebauer_story_submitted') === 'true')
  const [myMoment, setMyMoment] = useState(() => localStorage.getItem('gebauer_my_moment') || '')
  const [communityStories, setCommunityStories] = useState([])
  const [storyCount, setStoryCount] = useState(0)

  // Generate a voter ID for preventing double votes
  const getVoterId = () => {
    let id = localStorage.getItem('gebauer_voter_id')
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('gebauer_voter_id', id) }
    return id
  }

  // Fetch vote results and active poll on mount
  useEffect(() => {
    fetch('/api/vote?poll=wood').then(r => r.json()).then(d => { if (d.results) setWoodResults(d.results) }).catch(() => {})
    fetch('/api/stories').then(r => r.json()).then(d => {
      if (d.stories) setCommunityStories(d.stories)
      if (d.count) setStoryCount(d.count)
    }).catch(() => {})
    // Check if current user has submitted a story (persists across devices)
    const savedEmail = localStorage.getItem('gebauer_email')
    if (savedEmail && !localStorage.getItem('gebauer_story_submitted')) {
      fetch(`/api/check-story?email=${encodeURIComponent(savedEmail)}`).then(r => r.json()).then(d => {
        if (d.has_story) {
          localStorage.setItem('gebauer_story_submitted', 'true')
          setHasSubmittedStory(true)
          if (d.story && !localStorage.getItem('gebauer_my_moment')) {
            localStorage.setItem('gebauer_my_moment', d.story)
            setMyMoment(d.story)
          }
        }
      }).catch(() => {})
    }
    // Fetch rotating polls
    fetch('/api/polls').then(r => r.json()).then(d => {
      if (d.active) {
        setActivePoll(d.active)
        // Check if user already voted on this poll
        const votedPolls = JSON.parse(localStorage.getItem('gebauer_poll_votes') || '{}')
        if (votedPolls[d.active.id]) {
          setPollSubmitted(true)
          setPollVote(votedPolls[d.active.id])
        }
      }
      if (d.lastResult) setLastPollResult(d.lastResult)
    }).catch(() => {})
  }, [])

  const [pendingVote, setPendingVote] = useState('')
  const [designPollResults, setDesignPollResults] = useState({})

  const handlePollVote = async (choice) => {
    if (pollSubmitted || !activePoll) return
    const savedEmail = localStorage.getItem('gebauer_email')
    if (!savedEmail) {
      setShowSignup(true)
      return
    }
    // Must have submitted a story to vote
    if (!hasSubmittedStory) {
      setPollGated(true)
      return
    }
    setPollVote(choice)
    setPollSubmitted(true)
    // Save locally
    const votedPolls = JSON.parse(localStorage.getItem('gebauer_poll_votes') || '{}')
    votedPolls[activePoll.id] = choice
    localStorage.setItem('gebauer_poll_votes', JSON.stringify(votedPolls))
    // Save to server
    try {
      const resp = await fetch('/api/polls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: activePoll.id, choice, email: savedEmail }),
      })
      const data = await resp.json()
      if (data.votes) setActivePoll(prev => ({ ...prev, votes: data.votes, total: data.total }))
    } catch {}
  }

  const handleWoodVote = (wood) => {
    if (woodSubmitted) return
    const savedEmail = localStorage.getItem('gebauer_email')
    if (!savedEmail) {
      setPendingVote(wood)
      setShowSignup(true)
      return
    }
    setWoodVote(wood === woodVote ? '' : wood)
  }
  const handleWoodSubmit = async () => {
    if (!woodVote) return
    localStorage.setItem('gebauer_wood_vote', woodVote)
    localStorage.setItem('gebauer_wood_submitted', 'true')
    setWoodSubmitted(true)
    try {
      const resp = await fetch('/api/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: 'wood', option: woodVote, voter_id: getVoterId() }),
      })
      const data = await resp.json()
      if (data.results) setWoodResults(data.results)
    } catch {}
  }

  // Countdown to December 2026 drop
  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    const target = new Date('2026-12-01T00:00:00').getTime()
    const update = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setCountdown('The drop is here.'); return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      setCountdown(`${days}d ${hours}h`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  // Signup form fields. Start empty so the form doesn't auto-fill with a
  // previous user's identity (the June 21 2026 auto-login bug).
  // After a fresh signup or stats lookup, these get populated and persisted.
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [userData, setUserData] = useState(null) // { first_name, referral_code, referral_count, current_position }
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')

  // Fetch stats for a returning user
  const fetchStats = async (userEmail) => {
    if (!userEmail) return
    setStatsLoading(true)
    setStatsError('')
    try {
      const resp = await fetch(`/api/stats?email=${encodeURIComponent(userEmail)}`)
      const ct = resp.headers.get('content-type') || ''
      if (!ct.includes('application/json')) { setStatsLoading(false); return }
      const data = await resp.json()
      if (data.error) {
        setStatsError(data.error)
      } else {
        setUserData(data)
        // gebauer_email and gebauer_name are session-like markers used by polls,
        // votes, and the story system to remember what this user has done.
        // gebauer_last_email is the autofill suggestion shown in the My Spot modal.
        localStorage.setItem('gebauer_name', data.first_name)
        localStorage.setItem('gebauer_email', data.email)
        localStorage.setItem('gebauer_last_email', data.email)
        setFirstName(data.first_name)
        setEmail(data.email)
      }
    } catch { setStatsError('Could not load stats.') }
    finally { setStatsLoading(false) }
  }

  // On mount: check URL params + fetch waitlist total. We DO NOT auto-load
  // the previous user's identity anymore (fixed June 21 2026). Email is
  // remembered as an autofill suggestion in the My Spot modal, but the
  // user must click Sign In there to actually load their data. Previously
  // whoever last signed up on this browser became the auto-identity for
  // every future visitor, which was wrong (shared computers, family laptops).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('verified') === 'true') {
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Fetch waitlist total for the proof-strip display
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (data.total) setWaitlistCount(data.total)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (honeypot) return
    setError('')
    setLoading(true)
    try {
      const resp = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          email,
          honeypot,
          milestone_story: milestoneStory || undefined,
        }),
      })

      // Check if we got a valid JSON response (not an HTML error page)
      const contentType = resp.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        console.error('API returned non-JSON response. Status:', resp.status)
        setError('Signup is temporarily unavailable. Try again soon.')
        setLoading(false)
        return
      }

      const data = await resp.json()
      if (!resp.ok || data.error) {
        // If already on waitlist, just log them in instead of showing error
        if (data.error && data.error.includes('already on the waitlist')) {
          localStorage.setItem('gebauer_email', email.trim().toLowerCase())
          localStorage.setItem('gebauer_name', firstName.trim())
          localStorage.setItem('gebauer_last_email', email.trim().toLowerCase())
          if (milestoneStory.trim()) {
            // Save story separately for existing users
            fetch('/api/submit-story', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim().toLowerCase(), first_name: firstName.trim(), story: milestoneStory.trim() }),
            }).catch(() => {})
            localStorage.setItem('gebauer_story_submitted', 'true')
            localStorage.setItem('gebauer_my_moment', milestoneStory.trim())
            setHasSubmittedStory(true)
            setMyMoment(milestoneStory.trim())
            setCommunityStories(prev => [{ name: firstName.trim().split(' ')[0], story: milestoneStory.trim() }, ...prev])
            setStoryCount(prev => prev + 1)
          }
          fetchStats(email.trim().toLowerCase())
          setShowSignup(false)
          if (pendingVote) { setWoodVote(pendingVote); setPendingVote('') }
          return
        }
        setError(data.error || 'Something went wrong.')
      } else {
        // Instant signup. No verification needed.
        localStorage.setItem('gebauer_email', email.trim().toLowerCase())
        localStorage.setItem('gebauer_name', firstName.trim())
        localStorage.setItem('gebauer_last_email', email.trim().toLowerCase())
        if (milestoneStory.trim()) {
          localStorage.setItem('gebauer_story_submitted', 'true')
          localStorage.setItem('gebauer_my_moment', milestoneStory.trim())
          setHasSubmittedStory(true)
          setMyMoment(milestoneStory.trim())
          setCommunityStories(prev => [{ name: firstName.trim().split(' ')[0], story: milestoneStory.trim() }, ...prev])
          setStoryCount(prev => prev + 1)
        }
        fetchStats(email.trim().toLowerCase())
        if (pendingVote) { setWoodVote(pendingVote); setPendingVote('') }
        setLayer('inside')
        setShowSignup(false)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('Could not connect to the server. Try again.')
    }
    finally { setLoading(false) }
  }

  // ---- LAYER 2 ----
  if (layer === 'inside') {
    return <InsiderView
      firstName={userData?.first_name || firstName || 'there'}
      onBack={() => setLayer('landing')}
    />
  }

  // ---- LAYER 1 ----
  return (
    <>
      {/* NAV — always visible */}
      <nav className="site-nav">
        <a href="/" className="nav-logo"><img src={logo} alt="Gebauer" /></a>
        <div className="nav-links">
          <a href="#story" className="nav-link">Story</a>
          <a href="#watches" className="nav-link">Watches</a>
          <button className="nav-link" onClick={() => setShowStats(true)}>My Spot</button>
          <a href="/reserve" className="nav-link nav-link-primary">Reserve</a>
        </div>
        {/* Mobile hamburger */}
        <button className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span className={`nav-bar ${menuOpen ? 'open' : ''}`} />
          <span className={`nav-bar ${menuOpen ? 'open' : ''}`} />
          <span className={`nav-bar ${menuOpen ? 'open' : ''}`} />
        </button>
        {menuOpen && (
          <div className="nav-dropdown" onClick={() => setMenuOpen(false)}>
            <a href="#story" className="nav-link">Story</a>
            <a href="#watches" className="nav-link">Watches</a>
            <button className="nav-link" onClick={() => { setMenuOpen(false); setShowStats(true) }}>My Spot</button>
            <a href="/reserve" className="nav-link nav-link-primary">Reserve</a>
          </div>
        )}
      </nav>

      {/* 1. HERO — emotional hook */}
      <section className="hero">
        <img className="hero-img" src={kitchenTable} alt="Liam's kitchen table — where Gebauer is being built" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-headline fade-in">
            Help me build this from my kitchen table.
          </h1>
          <p className="hero-tagline fade-in-delay-1">A Gebauer doesn't just remember. It refuses to forget.</p>
          <div className="hero-buttons fade-in-delay-2">
            <a href="/reserve" className="hero-cta-btn">Reserve a Watch</a>
            <a href="#story" className="hero-stats-btn">Hear the Story</a>
            {email && (
              <button className="hero-stats-btn" onClick={() => setShowStats(true)}>My Spot</button>
            )}
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-hint-line" /></div>
      </section>

      {/* Social proof strip — separated from production scarcity. The 300 is a watch count,
          not a waitlist cap. Conflating them was making people think the WAITLIST was about
          to close, which hurt signups. Now: real waitlist growth on the left, real edition
          scarcity on the right, no math that subtracts one from the other. */}
      <Reveal className="proof-strip" as="section">
        <div className="proof-strip-inner">
          <div className="proof-stat">
            <span className="proof-stat-num">{waitlistCount}</span>
            <span className="proof-stat-label">OGs already in</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-stat">
            <span className="proof-stat-num">{storyCount > 0 ? storyCount : '—'}</span>
            <span className="proof-stat-label">moments shared</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-stat">
            <span className="proof-stat-num">300</span>
            <span className="proof-stat-label">first edition watches</span>
          </div>
        </div>
        <p className="proof-strip-sub">First edition. 300 watches. Numbered. Never made again.</p>
      </Reveal>

      {/* SCENE 1 — Milan. The buy that started it. Shorter than before, just the moment. */}
      <Reveal className="story-beat story-milan" id="story">
        <div className="story-beat-inner story-beat-over">
          <h2 className="story-beat-headline">I'm Liam. I'm 14. I bought a watch in Milan.</h2>
          <p className="story-beat-text">Walked into a Seiko store with 310 euros. No notifications. No swipes. Just the time. My three siblings saw it. They wanted one too.</p>
        </div>
      </Reveal>

      {/* SCENE 2 — Liam's own gift card pain. Specific (middle school grad), embarrassing, relatable. */}
      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">Then I started getting gift cards.</h2>
          <p className="story-beat-text">I spent one on pants I grew out of. A plant that sits in my room doing nothing. My middle school graduation gift card bought a snack at the airport. None of it stuck. None of it marked anything.</p>
        </div>
      </Reveal>

      {/* SCENE 3 — the insight. Tees up the watches reveal that comes immediately after. */}
      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">Then I put it together.</h2>
          <p className="story-beat-text">A watch. Made from wood, not plastic. Doesn't beep. Doesn't expire. Ages with you. The literal opposite of a gift card. So I started designing it.</p>
        </div>
      </Reveal>

      {/* The watch — comes right after "they deserve a Gebauer" so the reveal lands as the emotional payoff */}
      <Reveal className="story-beat story-dark" id="watches">
        <div className="story-beat-inner" style={{maxWidth: 960, textAlign: 'center'}}>
          <p className="watches-pre-label">First Edition · 300 only · Numbered</p>
          <h2 className="story-beat-headline">Three woods. Three stories. No two have ever been the same.</h2>
          <p className="story-beat-text">Each dial is cut from a real tree. The grain is the design.</p>
          <div className="origin-badge">
            <div className="origin-col">
              <p className="origin-label">Assembled in</p>
              <p className="origin-place">Northern</p>
              <p className="origin-country">Japan</p>
            </div>
            <div className="origin-col">
              <p className="origin-label">Boxed in</p>
              <p className="origin-place">Northern</p>
              <p className="origin-country">Italy</p>
            </div>
            <div className="origin-col">
              <p className="origin-label">Designed in</p>
              <p className="origin-place">Steamboat Springs</p>
              <p className="origin-country">Colorado</p>
            </div>
          </div>
          <div className="wood-grid">
            {[
              { id: 'padauk', img: watchPadauk, name: 'African Padauk', price: '$375', desc: 'Bleeds orange when cut. A wood that lives. And it doesn\'t stop changing.' },
              { id: 'ebony', img: watchEbony, name: 'Black Ebony', price: '$339', desc: 'Rarer than gold in ancient Egypt. Used for Tutankhamun\'s chair. Razor-thin grain, nearly black. Permanent.' },
              { id: 'hinoki', img: watchHinoki, name: 'Hinoki', price: '$299', desc: 'Japan\'s sacred cypress. Used to rebuild the Ise Jingu shrine for 1,300 years. Gets stronger as it ages.' },
            ].map(w => (
              <div key={w.id} className="wood-card">
                <div className="wood-card-img"><img src={w.img} alt={w.name} /></div>
                <h3>{w.name}</h3>
                {w.price && <p className="wood-price">{w.price}</p>}
                <p>{w.desc}</p>
                <a href={`/reserve?wood=${w.id}`} className="wood-vote-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Reserve one
                </a>
              </div>
            ))}
          </div>

        </div>
      </Reveal>

      {/* Padauk transformation — pulled OUT of the watches section onto its own cream-background beat so the visual jump from dark watches → cream reveal creates the "holy moley" moment. Sits immediately after the watches so all product info is still adjacent. */}
      <Reveal className="story-beat story-cream padauk-reveal">
        <div className="story-beat-inner" style={{textAlign: 'center', maxWidth: 760}}>
          <p className="padauk-transform-label">About Padauk</p>
          <h3 className="padauk-transform-headline">Here's the crazy part.</h3>
          <div className="watch-compare">
            <div className="watch-compare-item">
              <img src={watchPadauk} alt="Padauk, day one" />
              <p>Day one</p>
            </div>
            <div className="watch-compare-item">
              <img src={padaukDeep} alt="Padauk, years later" />
              <p>Years later</p>
            </div>
          </div>
          <p className="padauk-transform-text">Padauk shifts from fiery orange to deep burgundy over the years. No finish can stop it. The watch you wear at graduation won't look like the one you wear at 25. The wood remembers what you did with it.</p>
        </div>
      </Reveal>

      {/* SCENE 5 — vulnerability. The kid had no clue. */}
      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">But I had no idea where to start.</h2>
          <p className="story-beat-text">I'm 14. I don't run a watch company. So I emailed manufacturers in five countries. Most ignored me. Then one in Japan replied. Then one in Italy.</p>
        </div>
      </Reveal>

      {/* SCENE 6 — community emerges as the natural answer, not a marketing pitch. */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">I told my friends. They told their friends.</h2>
          <p className="story-beat-text">{waitlistCount} people signed up before I had a single sample to show. They started asking what I was actually making. So I asked them back.</p>
        </div>
      </Reveal>

      {/* SCENE 7 — "we" not "me". Updated 2026-07-14 to replace outdated voting claims with real conversation data. */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">That's when it became us. Not me.</h2>
          <p className="story-beat-text">I've had one-on-one conversations with over 60 of them. Every question, every "what if you..." shaped what I built.</p>
        </div>
      </Reveal>

      {/* SCENE 9 — the workshop is still open. Updated 2026-07-14 to remove references to a live poll that no longer exists. */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">The workshop is still open.</h2>
          <p className="story-beat-text">Samples land in weeks. Kickstarter opens this fall. You're not joining a finished thing. You're walking in mid-build.</p>
        </div>
      </Reveal>

      {/* Rotating polls section removed 2026-07-08 per founder call.
          The design decisions the polls tracked (2 hands vs 3, crown design,
          clasp engraving, caseback raven) are all locked in the final tech
          drawings from Tokiji, so continuing to show a "last decision / coming
          up next" panel with 0 votes and stale question copy was misleading.
          Poll infrastructure (activePoll state, POLL_IMAGES, handlePollVote
          etc.) stays in the codebase for now in case a future short-run
          co-design moment wants to bring polls back with a limited surface. */}
      {false && (activePoll || lastPollResult) && (
        <Reveal className="story-beat story-cream">
          <div className="story-beat-inner" style={{maxWidth: 700, textAlign: 'center'}}>
            {activePoll && !pollSubmitted && !localStorage.getItem('gebauer_email') ? (
              <>
                <p className="poll-label">Live right now</p>
                <h2 className="story-beat-headline">{activePoll.question}</h2>
                <p className="poll-urgency">This vote closes in {(() => { const ms = (3 * 24 * 60 * 60 * 1000) - (Date.now() - new Date(activePoll.created_at).getTime()); if (ms <= 0) return 'less than an hour'; const h = Math.floor(ms / 3600000); if (h >= 24) return `${Math.floor(h / 24)} day${Math.floor(h / 24) !== 1 ? 's' : ''}`; return `${h} hour${h !== 1 ? 's' : ''}`; })()}. Sign up to vote.</p>
                <div className="poll-options">
                  {(activePoll.options || []).map((opt, i) => (
                    <>
                      {i > 0 && (activePoll.options || []).length === 2 && <span className="poll-vs">vs</span>}
                      <button key={opt} className={`poll-option-btn ${POLL_IMAGES[opt] ? 'has-img' : ''}`} onClick={() => { setShowSignup(true) }}>
                        {POLL_IMAGES[opt] && <img src={POLL_IMAGES[opt].img} alt={opt} className="poll-option-img" />}
                        <span className="poll-option-name">{opt}</span>
                        {POLL_IMAGES[opt] && <span className="poll-option-desc">{POLL_IMAGES[opt].desc}</span>}
                      </button>
                    </>
                  ))}
                </div>
              </>
            ) : activePoll && !pollSubmitted && !pollGated && hasSubmittedStory ? (
              <>
                <p className="poll-label">Live right now</p>
                <h2 className="story-beat-headline">{activePoll.question}</h2>
                <p className="poll-urgency">This vote closes in {(() => { const ms = (3 * 24 * 60 * 60 * 1000) - (Date.now() - new Date(activePoll.created_at).getTime()); if (ms <= 0) return 'less than an hour'; const h = Math.floor(ms / 3600000); if (h >= 24) return `${Math.floor(h / 24)} day${Math.floor(h / 24) !== 1 ? 's' : ''}`; return `${h} hour${h !== 1 ? 's' : ''}`; })()}.</p>
                <div className="poll-options">
                  {(activePoll.options || []).map((opt, i) => (
                    <>
                      {i > 0 && (activePoll.options || []).length === 2 && <span className="poll-vs">vs</span>}
                      <button key={opt} className={`poll-option-btn ${POLL_IMAGES[opt] ? 'has-img' : ''}`} onClick={() => handlePollVote(opt)}>
                        {POLL_IMAGES[opt] && <img src={POLL_IMAGES[opt].img} alt={opt} className="poll-option-img" />}
                        <span className="poll-option-name">{opt}</span>
                        {POLL_IMAGES[opt] && <span className="poll-option-desc">{POLL_IMAGES[opt].desc}</span>}
                      </button>
                    </>
                  ))}
                </div>
              </>
            ) : activePoll && !pollSubmitted && (pollGated || (localStorage.getItem('gebauer_email') && !hasSubmittedStory)) ? (
              <>
                <p className="poll-label">Locked</p>
                <h2 className="story-beat-headline">{activePoll.question}</h2>
                <p className="poll-urgency">This vote closes in {(() => { const ms = (3 * 24 * 60 * 60 * 1000) - (Date.now() - new Date(activePoll.created_at).getTime()); if (ms <= 0) return 'less than an hour'; const h = Math.floor(ms / 3600000); if (h >= 24) return `${Math.floor(h / 24)} day${Math.floor(h / 24) !== 1 ? 's' : ''}`; return `${h} hour${h !== 1 ? 's' : ''}`; })()}.</p>
                <div className="poll-options">
                  {(activePoll.options || []).map((opt, i) => (
                    <>
                      {i > 0 && (activePoll.options || []).length === 2 && <span className="poll-vs">vs</span>}
                      <div key={opt} className={`poll-option-btn locked ${POLL_IMAGES[opt] ? 'has-img' : ''}`}>
                        {POLL_IMAGES[opt] && <img src={POLL_IMAGES[opt].img} alt={opt} className="poll-option-img" />}
                        <span className="poll-option-name">{opt}</span>
                        {POLL_IMAGES[opt] && <span className="poll-option-desc">{POLL_IMAGES[opt].desc}</span>}
                      </div>
                    </>
                  ))}
                </div>
                <p className="poll-gate-msg">Submit your moment to unlock your vote. The people shaping this watch are the ones who gave something real.</p>
                <button className="story-cta" onClick={() => setShowSignup(true)}>Share My Moment</button>
              </>
            ) : activePoll && pollSubmitted ? (
              <>
                <p className="poll-label">You voted</p>
                <h2 className="story-beat-headline">{activePoll.question}</h2>
                <div className="poll-results-list">
                  {(activePoll.options || []).map(opt => {
                    const total = activePoll.total || 1
                    const count = (activePoll.votes || {})[opt] || 0
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div key={opt} className={`wood-result-bar ${pollVote === opt ? 'voted' : ''}`}>
                        <span className="wood-result-name">{opt}</span>
                        <div className="wood-result-track"><div className="wood-result-fill" style={{width: `${pct}%`}} /></div>
                        <span className="wood-result-pct">{pct}%</span>
                      </div>
                    )
                  })}
                  <p className="wood-result-total">{activePoll.total || 0} vote{(activePoll.total || 0) !== 1 ? 's' : ''}</p>
                </div>
                <p className="poll-urgency">Next decision drops in a few days. Come back.</p>
              </>
            ) : lastPollResult ? (
              <>
                <p className="poll-label">Last decision</p>
                <h2 className="story-beat-headline">{lastPollResult.question}</h2>
                <div className="poll-results-list">
                  {(lastPollResult.options || []).map(opt => {
                    const total = lastPollResult.total || 1
                    const count = (lastPollResult.votes || {})[opt] || 0
                    const pct = Math.round((count / total) * 100)
                    return (
                      <div key={opt} className={`wood-result-bar ${opt === lastPollResult.winner ? 'voted' : ''}`}>
                        <span className="wood-result-name">{opt}</span>
                        <div className="wood-result-track"><div className="wood-result-fill" style={{width: `${pct}%`}} /></div>
                        <span className="wood-result-pct">{pct}%</span>
                      </div>
                    )
                  })}
                  <p className="wood-result-total">{lastPollResult.total || 0} vote{(lastPollResult.total || 0) !== 1 ? 's' : ''}</p>
                  {lastPollResult.winner && <p className="poll-winner">The OGs decided: {lastPollResult.winner}</p>}
                </div>
                <p className="poll-urgency">You missed this one. Next vote drops soon.</p>
              </>
            ) : null}
            <div className="poll-upcoming">
              <p className="poll-label">Coming up next</p>
              <p className="poll-upcoming-item">Crown design</p>
              <p className="poll-upcoming-item">Clasp engraving</p>
              <p className="poll-upcoming-item">Caseback raven style</p>
            </div>
          </div>
        </Reveal>
      )}

      {/* SCENE 11 — the workshop wall. Pinned moments from OGs. Yours could be next. */}
      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">These are pinned on the workshop wall.</h2>
          {hasSubmittedStory ? (
            <>
              {myMoment && (
                <div className="my-moment-card">
                  <p className="my-moment-label">YOUR MOMENT</p>
                  <p className="my-moment-text">"{myMoment}"</p>
                  <p className="my-moment-note">Printed on a card. Placed inside your box.</p>
                </div>
              )}
              {communityStories.length > 0 && (
                <div className="community-stories">
                  {communityStories.slice(0, 6).map((s, i) => (
                    <div key={i} className="community-story">
                      <p className="community-story-text">"{s.story}"</p>
                      <p className="community-story-name">{s.name}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="story-count-line">{storyCount} moments submitted. 300 watches.</p>
            </>
          ) : (
            <div className="moments-locked">
              <p className="moments-locked-count">{storyCount > 0 ? `${storyCount} moments shared so far.` : 'Be the first to share yours.'}</p>
              <p className="moments-locked-msg">Share your moment to read theirs.</p>
              <button className="story-cta" onClick={() => setShowSignup(true)}>Share My Moment</button>
            </div>
          )}
        </div>
      </Reveal>

      {/* The door */}
      <Reveal className="story-beat story-dark story-center">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <div className="og-counter">
            <span className="og-number">{waitlistCount}</span>
            <span className="og-label">OGs</span>
            <span className="og-divider">/</span>
            <span className="og-number">300</span>
            <span className="og-label">watches</span>
          </div>
          <h2 className="story-beat-headline">This is the door.</h2>
          <p className="story-beat-text">Beyond it: the next vote, the next drop, the card that ships in your box with the moment you submitted. 300 watches. Numbered in the order people joined. Once 300 is gone, it's gone.</p>
          <div className="invitation-buttons">
            <button className="story-cta" onClick={() => setShowSignup(true)}>Share My Moment</button>
            {email && (
              <button className="story-share" onClick={() => setShowStats(true)}>Check My Status</button>
            )}
            <button className="story-share" onClick={(e) => {
              if (navigator.share) {
                navigator.share({ title: 'Gebauer Watches', text: '300 watches. Real wood dials. Built from a kitchen table. I\'m one of the OGs.', url: 'https://gebauerwatches.com' })
              } else {
                navigator.clipboard.writeText('https://gebauerwatches.com')
                e.currentTarget.textContent = 'Link Copied'
                const target = e.currentTarget
                setTimeout(() => { target.textContent = 'Share Gebauer' }, 2000)
              }
            }}>Share Gebauer</button>
          </div>
        </div>
      </Reveal>

      {/* FOOTER */}
      <footer className="site-footer">
        <img src={logo} alt="Gebauer" className="footer-logo" />
        <p className="footer-tagline">Assembled in Japan. Boxed in Italy.</p>
        <p className="footer-journal">
          <a href="https://gebauerwatches.substack.com" target="_blank" rel="noopener noreferrer">
            Read Liam's daily journal on Substack →
          </a>
        </p>
        <p className="footer-copy">&copy; {new Date().getFullYear()} Gebauer Watches</p>
        <a href="/privacy" className="footer-legal" onClick={() => window.location.href = '/privacy'}>Privacy Policy</a>
      </footer>


      {/* SIGNUP MODAL */}
      {showSignup && (
        <div className="signup-overlay overlay-enter">
          <div className="signup-backdrop" onClick={() => { setShowSignup(false); setNeedsVerification(false) }} />
          <div className="signup-card card-enter">
            <button className="signup-close" onClick={() => { setShowSignup(false); setNeedsVerification(false) }} aria-label="Close">&times;</button>

            {needsVerification ? (
              <>
                <div className="verify-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2>Check Your Email</h2>
                <p className="signup-sub">We sent a link to <strong>{email}</strong>. Click it and you're in.</p>
                <p className="verify-note">Link expires in 48 hours. Check spam if you don't see it.</p>
              </>
            ) : (
              <>
                <h2>If you could relive one moment, which one?</h2>
                <p className="signup-sub">That's what Gebauer is for. The moments worth holding onto.</p>
                <form className="signup-form" onSubmit={handleSubmit}>
                  <div className="honeypot" aria-hidden="true"><input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" /></div>
                  <div><label htmlFor="milestoneStory">Your moment</label><textarea id="milestoneStory" placeholder="One sentence is enough." value={milestoneStory} onChange={(e) => setMilestoneStory(e.target.value)} maxLength={500} rows={2} className="signup-story" /></div>
                  <div><label htmlFor="firstName">Name</label><input id="firstName" type="text" placeholder="Your name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} /></div>
                  <div><label htmlFor="email">Email</label><input id="email" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} /></div>
                  {error && <p className="signup-error">{error}</p>}
                  <button type="submit" className="signup-submit" disabled={loading}>{loading ? 'Joining...' : 'Submit My Moment'}</button>
                </form>
                <p className="signup-count">You don't have to share. But those who do get deeper access.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* STATS LOOKUP MODAL */}
      {showStats && (
        <div className="signup-overlay overlay-enter">
          <div className="signup-backdrop" onClick={() => setShowStats(false)} />
          <div className="signup-card card-enter">
            <button className="signup-close" onClick={() => setShowStats(false)} aria-label="Close">&times;</button>

            {userData ? (
              <>
                <h2>Welcome back, {userData.first_name}.</h2>
                <p className="signup-sub">Your stats are ready.</p>
                <button className="signup-submit" onClick={() => { setShowStats(false); setLayer('inside') }}>View My Spot</button>
              </>
            ) : (
              <>
                <h2>Check Your Stats</h2>
                <p className="signup-sub">Enter the email you signed up with.</p>
                <form className="signup-form" onSubmit={async (e) => {
                  e.preventDefault()
                  setStatsError('')
                  setStatsLoading(true)
                  try {
                    const resp = await fetch(`/api/stats?email=${encodeURIComponent(statsEmail)}`)
                    const ct = resp.headers.get('content-type') || ''
                    if (!ct.includes('application/json')) { setStatsError('Could not connect.'); return }
                    const data = await resp.json()
                    if (data.error) {
                      setStatsError(data.error)
                    } else {
                      setUserData(data)
                      localStorage.setItem('gebauer_email', data.email)
                      localStorage.setItem('gebauer_name', data.first_name)
                      localStorage.setItem('gebauer_last_email', data.email)
                      setFirstName(data.first_name)
                      setEmail(data.email)
                      setShowStats(false)
                      setLayer('inside')
                    }
                  } catch { setStatsError('Could not connect.') }
                  finally { setStatsLoading(false) }
                }}>
                  <div>
                    <label htmlFor="statsEmail">Email</label>
                    <input id="statsEmail" type="email" placeholder="Your email" value={statsEmail} onChange={(e) => setStatsEmail(e.target.value)} required maxLength={255} />
                  </div>
                  {statsError && <p className="signup-error">{statsError}</p>}
                  <button type="submit" className="signup-submit" disabled={statsLoading}>{statsLoading ? 'Looking up...' : 'View My Spot'}</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default App
