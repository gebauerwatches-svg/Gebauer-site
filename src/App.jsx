import { useState, useEffect, useRef } from 'react'
import logo from './assets/gebauer-logo.svg'
import heroVideo from './assets/gebauer-hero-video.mp4'
import watchEbony from './assets/gebauer-ebony-watch.jpeg'
import watchHinoki from './assets/image0.jpeg'
import watchPadauk from './assets/image1-1.jpeg'
import './App.css'

const RAVEN_PATH = [
  { name: 'Villager', referrals: 0, unlock: 'In the movement.', symbol: '\u2302' },
  { name: 'Kindling', referrals: 2, unlock: 'Raven artwork.', symbol: '\u2740' },
  { name: 'Runecaster', referrals: 5, unlock: 'Behind-the-scenes.', symbol: '\u16B1' },
  { name: 'Skald', referrals: 8, unlock: 'Early sample photos.', symbol: '\u266B' },
  { name: 'Einherjar', referrals: 12, unlock: 'Founders Wall.', symbol: '\u2694' },
  { name: 'Jarl', referrals: 16, unlock: 'Pick your number.', symbol: '\u2655' },
  { name: 'Muninn', referrals: 20, unlock: 'Inner circle.', symbol: '\u273B' },
  { name: 'Huginn', referrals: 25, unlock: 'Signed card from Liam.', symbol: '\u2726' },
]

const FALLBACK_WAITLIST_COUNT = 152

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


// Helper: figure out rank from referral count
function getRankInfo(referrals) {
  let idx = 0
  for (let i = RAVEN_PATH.length - 1; i >= 0; i--) {
    if (referrals >= RAVEN_PATH[i].referrals) { idx = i; break }
  }
  return { index: idx, rank: RAVEN_PATH[idx], next: RAVEN_PATH[idx + 1] || null }
}

function App() {
  const [layer, setLayer] = useState('landing')
  const [showSignup, setShowSignup] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [referralFrom, setReferralFrom] = useState('')
  const [showStats, setShowStats] = useState(false)
  const [statsEmail, setStatsEmail] = useState(() => localStorage.getItem('gebauer_email') || '')
  const [leaderboard, setLeaderboard] = useState([])
  const [waitlistCount, setWaitlistCount] = useState(FALLBACK_WAITLIST_COUNT)

  // Wood voting (localStorage only, fun interaction)
  const [woodVote, setWoodVote] = useState(() => localStorage.getItem('gebauer_wood_vote') || '')
  const [woodSubmitted, setWoodSubmitted] = useState(() => localStorage.getItem('gebauer_wood_submitted') === 'true')
  const handleWoodVote = (wood) => {
    if (woodSubmitted) return
    setWoodVote(wood === woodVote ? '' : wood)
  }
  const handleWoodSubmit = () => {
    if (!woodVote) return
    localStorage.setItem('gebauer_wood_vote', woodVote)
    localStorage.setItem('gebauer_wood_submitted', 'true')
    setWoodSubmitted(true)
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

  // User data (persisted in localStorage, fetched from API)
  const [firstName, setFirstName] = useState(() => localStorage.getItem('gebauer_name') || '')
  const [email, setEmail] = useState(() => localStorage.getItem('gebauer_email') || '')
  const [userData, setUserData] = useState(null) // { first_name, referral_count, referral_code, current_position }
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
        localStorage.setItem('gebauer_name', data.first_name)
        localStorage.setItem('gebauer_email', data.email)
        setFirstName(data.first_name)
        setEmail(data.email)
      }
    } catch { setStatsError('Could not load stats.') }
    finally { setStatsLoading(false) }
  }

  // On mount: check URL params, auto-fetch stats for returning users
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('verified') === 'true') {
      const savedEmail = localStorage.getItem('gebauer_email')
      if (savedEmail) fetchStats(savedEmail)
      setLayer('inside')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('ref')) setReferralFrom(params.get('ref'))

    // Auto-fetch stats if we have a saved email
    const savedEmail = localStorage.getItem('gebauer_email')
    if (savedEmail) fetchStats(savedEmail)

    // Fetch real leaderboard
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (data.leaderboard) setLeaderboard(data.leaderboard)
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
          referred_by: referralFrom || undefined,
          honeypot,
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
        setError(data.error || 'Something went wrong.')
      } else if (data.needs_verification) {
        localStorage.setItem('gebauer_email', email.trim().toLowerCase())
        localStorage.setItem('gebauer_name', firstName.trim())
        setNeedsVerification(true)
      } else {
        localStorage.setItem('gebauer_email', email.trim().toLowerCase())
        localStorage.setItem('gebauer_name', firstName.trim())
        setLayer('inside')
        setShowSignup(false)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('Could not connect to the server. Try again.')
    }
    finally { setLoading(false) }
  }

  const handleCopyLink = () => {
    const code = userData?.referral_code || ''
    navigator.clipboard.writeText(`https://gebauerwatches.com/?ref=${code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Compute rank from real or demo data
  const userReferrals = userData?.referral_count ?? 0
  const { index: currentRankIndex, rank: currentRank, next: nextRank } = getRankInfo(userReferrals)

  // ---- LAYER 2 ----
  if (layer === 'inside') {
    const displayName = userData?.first_name || firstName || 'there'
    const refCode = userData?.referral_code || ''

    return (
      <div className="l2">
        {/* Big rank header */}
        <header className="l2-welcome">
          <img src={logo} alt="Gebauer" className="l2-logo" />
          <h1 className="l2-rank-hero fade-in">
            You are <em>{currentRank.name}</em>
          </h1>
          <p className="l2-rank-detail fade-in-delay-1">
            {userReferrals} referral{userReferrals !== 1 ? 's' : ''}
          </p>
          <p className="l2-welcome-sub fade-in-delay-1">
            {displayName}, you're early. Watch 001 ships in December to whoever ends up at #1.
          </p>
        </header>

        {/* Referral link */}
        <section className="l2-referral fade-in-delay-1">
          <p className="l2-section-label">Your Referral Link</p>
          <div className="l2-referral-box">
            <span className="l2-referral-url">
              {refCode ? `gebauerwatches.com/?ref=${refCode}` : 'Loading...'}
            </span>
            <button className="l2-copy-btn" onClick={handleCopyLink} disabled={!refCode}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="l2-referral-hint">Every friend who joins moves you up The Igdrasil.</p>
        </section>

        {/* Next rank progress */}
        {nextRank && (
          <section className="l2-next-rank fade-in-delay-2">
            <p className="l2-next-rank-text">
              Refer {nextRank.referrals - userReferrals} more to become <strong>{nextRank.name}</strong>.
            </p>
            <div className="l2-next-rank-bar"><div className="l2-next-rank-fill" style={{ width: `${Math.min(100, ((userReferrals - currentRank.referrals) / (nextRank.referrals - currentRank.referrals)) * 100)}%` }} /></div>
          </section>
        )}
        <section className="l2-igdrasil fade-in-delay-2">
          <h2 className="l2-igdrasil-title">The Igdrasil</h2>
          <div className="l2-tree">
            {[...RAVEN_PATH].reverse().map((rank, i) => {
              const oi = RAVEN_PATH.length - 1 - i, isUnlocked = userReferrals >= rank.referrals, isCurrent = oi === currentRankIndex, isTop = oi === RAVEN_PATH.length - 1
              return (
                <div key={rank.name} className={`l2-tree-node ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`}>
                  {!isTop && <div className={`l2-tree-branch ${isUnlocked ? 'unlocked' : ''}`} />}
                  <div className="l2-tree-circle">{isUnlocked ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <span className="l2-tree-dot" />}</div>
                  <div className="l2-tree-info"><div className="l2-tree-rank-row"><h3 className="l2-tree-rank-name">{rank.name}</h3><span className="l2-tree-referrals">{rank.referrals === 0 ? 'Start' : `${rank.referrals}`}</span></div><p className="l2-tree-unlock">{rank.unlock}</p></div>
                </div>
              )
            })}
          </div>
        </section>
        {leaderboard.length > 0 && (
          <section className="l2-leaderboard fade-in-delay-3">
            <h3 className="l2-leaderboard-title">The Leaderboard</h3>
            <p className="l2-leaderboard-sub">Everyone who's referred. Watch 001 goes to #1 when we ship.</p>
            <div className="l2-leaderboard-list">{leaderboard.map((p, i) => <div key={p.name + i} className={`l2-leaderboard-row ${i === 0 ? 'l2-first' : ''}`}><span className="l2-leaderboard-pos">{i+1}</span><span className="l2-leaderboard-name">{p.name}</span><span className="l2-leaderboard-refs">{p.referrals}</span><span className="l2-leaderboard-label">{p.referrals === 1 ? 'referral' : 'referrals'}</span></div>)}</div>
            <p className="l2-leaderboard-deadline">Leaderboard closes June 30.</p>
          </section>
        )}
        <footer className="l2-footer"><button className="l2-back" onClick={() => setLayer('landing')}>Back to home</button><p>&copy; {new Date().getFullYear()} Gebauer Watches</p></footer>
      </div>
    )
  }

  // ---- LAYER 1 ----
  return (
    <>
      {/* 1. HERO */}
      <section className="hero">
        <video className="hero-video" src={heroVideo} autoPlay muted loop playsInline />
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-headline fade-in">
            Built by Teens,
            <span className="hero-accent"> For Teens.</span>
          </h1>
          <p className="hero-sub fade-in-delay-1">300 watches. Real wood dials. Made in Japan. First drop December 2026.</p>
          <div className="hero-cta fade-in-delay-1">
            <button className="hero-join-btn" onClick={() => setShowSignup(true)}>Get In</button>
            <button className="hero-stats-btn" onClick={() => setShowStats(true)}>My Stats</button>
            <p className="hero-proof">{waitlistCount} already in. {300 - waitlistCount} spots left.</p>
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-hint-line" /></div>
      </section>

      {/* 2. THE STORY (light) */}
      <Reveal className="founder">
        <div className="founder-inner">
          <h2 className="founder-headline">
            Most watch brands are built by old guys in suits.
            <em> Not us.</em>
          </h2>
          <p className="founder-text">
            Bought my first real watch in Milan at 15. Spent a year studying movements and materials. Found a manufacturer in Japan. Now I'm the youngest founder in the High Country Accelerator with 300 watches on the way. This drop is just the first chapter.
          </p>
          <p className="founder-signoff">— Liam, 16</p>
          <div className="founder-stats">
            <div className="founder-stat"><span className="founder-stat-num">2hrs/day</span><span className="founder-stat-label">after school, every day</span></div>
            <div className="founder-stat"><span className="founder-stat-num">60+</span><span className="founder-stat-label">teens interviewed</span></div>
            <div className="founder-stat"><span className="founder-stat-num">Japan</span><span className="founder-stat-label">manufacturing partner</span></div>
          </div>
        </div>
      </Reveal>

      {/* 3. THE WATCHES + VOTE (cream) */}
      <Reveal className="wood">
        <h2 className="wood-headline">Three woods. <em>Which one's yours?</em></h2>
        <div className="wood-grid">
          {[
            { id: 'padauk', img: watchPadauk, name: 'African Padauk', tagline: 'Ages in real time.', fact: 'Starts orange. Darkens to burgundy over years. The only watch that changes color with time.' },
            { id: 'ebony', img: watchEbony, name: 'Black Ebony', tagline: 'Rarer than gold. Once.', fact: 'Nearly black. Razor-thin grain. Rarer than gold in ancient Egypt. The flex is quiet.' },
            { id: 'hinoki', img: watchHinoki, name: 'Hinoki', tagline: 'Sacred wood.', fact: 'Built Japanese temples for 1,000+ years. Forests protected by law. Soft golden grain.' },
          ].map(w => (
            <div key={w.id} className={`wood-card ${woodVote === w.id ? 'voted' : ''}`}>
              <div className="wood-img-wrap"><img src={w.img} alt={w.name} /></div>
              <h3>{w.name}</h3>
              <p className="wood-tagline">{w.tagline}</p>
              <p className="wood-fact">{w.fact}</p>
              <button className={`wood-vote-btn ${woodVote === w.id ? 'active' : ''}`} onClick={() => handleWoodVote(w.id)}>
                {woodVote === w.id ? 'Your pick' : 'This one'}
              </button>
            </div>
          ))}
        </div>
        {!woodSubmitted && woodVote && (
          <button className="wood-submit-btn" onClick={handleWoodSubmit}>Submit My Pick</button>
        )}
        {woodSubmitted && (
          <div className="wood-vote-confirmed">
            {woodVote === 'padauk' && <p>Padauk. You want a watch that tells a different story every year. Respect.</p>}
            {woodVote === 'ebony' && <p>Ebony. The rarest one. You know exactly what you want.</p>}
            {woodVote === 'hinoki' && <p>Hinoki. Sacred Japanese wood on your wrist. That's a quiet flex nobody else would think of.</p>}
            <span className="wood-vote-check">Vote recorded</span>
          </div>
        )}
      </Reveal>

      {/* 4. WHAT YOU GET (dark) */}
      <Reveal className="perks">
        <div className="perks-inner">
          <h2 className="perks-headline">What you get for being early.</h2>
          <div className="perks-grid">
            <div className="perks-item">
              <span className="perks-icon">&#9670;</span>
              <h3>Behind the Scenes</h3>
              <p>Factory footage, design decisions, wood sourcing. Before anyone else.</p>
            </div>
            <div className="perks-item">
              <span className="perks-icon">&#9670;</span>
              <h3>First Look at Samples</h3>
              <p>When they arrive this summer, you see them first.</p>
            </div>
            <div className="perks-item">
              <span className="perks-icon">&#9670;</span>
              <h3>Pick Your Number</h3>
              <p>Top referrers choose their edition. 001, 042, 300.</p>
            </div>
            <div className="perks-item">
              <span className="perks-icon">&#9670;</span>
              <h3>Founders Wall</h3>
              <p>Your name. Permanent. Before anyone knew.</p>
            </div>
          </div>
          <button className="perks-cta" onClick={() => setShowSignup(true)}>Get In</button>
        </div>
      </Reveal>

      {/* 5. YOUR PATH (light) — compact Igdrasil, personal focus */}
      <Reveal className="path-section">
        <div className="path-inner">
          {countdown && <p className="path-countdown">{countdown} until the first drop</p>}
          <h2 className="path-headline">Your path. <em>The Raven Path.</em></h2>
          <p className="path-sub">Refer friends. Climb the ranks. Each one unlocks something real.</p>

          <div className="mini-tree">
            <svg className="mini-tree-svg" viewBox="0 0 160 520" fill="none" preserveAspectRatio="xMidYMid meet">
              <path d="M80 520 Q65 510 50 515 Q35 520 20 518" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.2" />
              <path d="M80 520 Q95 510 110 515 Q125 520 140 518" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.2" />
              <path d="M80 520 Q78 430 80 340 Q82 250 80 160 Q78 80 80 10" stroke="url(#mt-grad)" strokeWidth="3" strokeLinecap="round" />
              <path d="M80 455 Q55 450 40 447" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.2" />
              <path d="M80 390 Q105 385 125 382" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.2" />
              <path d="M80 325 Q50 318 38 313" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.15" />
              <path d="M80 260 Q110 253 128 248" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.15" />
              <path d="M80 195 Q48 186 35 180" stroke="var(--purple-mid)" strokeWidth="1" opacity="0.12" />
              <path d="M80 130 Q112 123 128 118" stroke="var(--purple-mid)" strokeWidth="1" opacity="0.12" />
              <path d="M80 70 Q50 62 40 58" stroke="var(--purple-mid)" strokeWidth="1" opacity="0.1" />
              <path d="M80 10 Q65 0 50 4" stroke="var(--gold-muted)" strokeWidth="1" opacity="0.15" />
              <path d="M80 10 Q95 0 110 4" stroke="var(--gold-muted)" strokeWidth="1" opacity="0.15" />
              <defs>
                <linearGradient id="mt-grad" x1="80" y1="520" x2="80" y2="10" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="var(--purple-glow)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--purple-mid)" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="mini-tree-nodes">
              {[...RAVEN_PATH].reverse().map((rank, i) => {
                const oi = RAVEN_PATH.length - 1 - i
                const isReached = oi <= currentRankIndex
                const isActive = oi === currentRankIndex
                const side = oi % 2 === 0 ? 'left' : 'right'
                return (
                  <div key={rank.name} className={`mt-node ${isReached ? 'reached' : 'locked'} ${isActive ? 'active' : ''} ${side}`}>
                    <div className="mt-orb"><span>{rank.symbol}</span>{isActive && <div className="mt-pulse" />}</div>
                    <div className="mt-info">
                      <h3>{rank.name}</h3>
                      <span className="mt-refs">{rank.referrals === 0 ? 'Start' : rank.referrals}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="path-deadline">Leaderboard closes June 30. Watch 001 goes to #1.</p>

          <div className="path-actions">
            <button className="path-cta" onClick={() => setShowSignup(true)}>Get In</button>
            <button className="path-stats-btn" onClick={() => setShowStats(true)}>Check My Stats</button>
          </div>
          <button className="share-btn" onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'Gebauer Watches', text: '300 watches. Real wood dials. Made in Japan. Built by a 16 year old. The first drop is December 2026.', url: 'https://gebauerwatches.com' })
            } else {
              navigator.clipboard.writeText('https://gebauerwatches.com')
              const btn = document.querySelector('.share-btn')
              btn.textContent = 'Link Copied'
              setTimeout(() => { btn.textContent = 'Share Gebauer' }, 2000)
            }
          }}>Share Gebauer</button>
        </div>
      </Reveal>

      {/* FOOTER */}
      <footer className="site-footer">
        <RavenIcon className="footer-raven" size={24} />
        <img src={logo} alt="Gebauer" className="footer-logo" />
        <p className="footer-raven-line">The raven is on the back. You see it when it's on your wrist.</p>
        <p className="footer-tagline">Built by a 16 year old. Made in Japan. First drop December 2026.</p>
        <p className="footer-copy">&copy; {new Date().getFullYear()} Gebauer Watches</p>
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
                <h2>Get In</h2>
                <p className="signup-sub">You're early. That's the point.</p>
                <form className="signup-form" onSubmit={handleSubmit}>
                  <div className="honeypot" aria-hidden="true"><input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" /></div>
                  <div><label htmlFor="firstName">Full Name</label><input id="firstName" type="text" placeholder="Your name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} /></div>
                  <div><label htmlFor="email">Email</label><input id="email" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} /></div>
                  {error && <p className="signup-error">{error}</p>}
                  <button type="submit" className="signup-submit" disabled={loading}>{loading ? 'Joining...' : 'Join the Movement'}</button>
                </form>
                <p className="signup-count">{waitlistCount} people are already in.</p>
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
                <button className="signup-submit" onClick={() => { setShowStats(false); setLayer('inside') }}>View My Stats</button>
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
                  <button type="submit" className="signup-submit" disabled={statsLoading}>{statsLoading ? 'Looking up...' : 'View My Stats'}</button>
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
