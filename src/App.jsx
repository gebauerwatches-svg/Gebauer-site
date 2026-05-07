import { useState, useEffect, useRef } from 'react'
import logo from './assets/gebauer-logo.svg'
import heroVideo from './assets/gebauer-hero-video.mp4'
import watchEbony from './assets/gebauer-ebony-watch.jpeg'
import ravenSimple from './assets/raven-simple.png'
import ravenMinimal from './assets/raven-minimal.png'
import claspButterfly from './assets/polls/clasp-butterfly.png'
import claspDeployed from './assets/polls/clasp-deployed.png'
import boxDebossed from './assets/polls/box-debossed.png'
import boxGoldLogo from './assets/polls/box-gold-logo.png'
import interiorSuede from './assets/polls/interior-suede.jpeg'
import interiorMicrofiber from './assets/polls/interior-microfiber.jpeg'
import watchHinoki from './assets/image0.jpeg'
import watchPadauk from './assets/padauk-new-matched.jpeg'
import padaukAged from './assets/padauk-aged.jpeg'
import padaukDeep from './assets/padauk-deep.jpeg'
import milanBg from './assets/milan.jpeg'
import './App.css'

const RAVEN_PATH = [
  { name: 'Villager', referrals: 0, unlock: 'You signed up. But you\'re not in the movement yet.', tease: '', spots: null, symbol: '\u2302' },
  { name: 'Kindling', referrals: 2, unlock: 'You\'re in. Welcome to the movement.', tease: 'Bring 2 people and the door opens...', spots: null, symbol: '\u2740' },
  { name: 'Runecaster', referrals: 5, unlock: 'You see what we\'re building before anyone else.', tease: 'Something most people never get to see...', spots: 50, symbol: '\u16B1' },
  { name: 'Skald', referrals: 8, unlock: 'Your voice shapes what Gebauer becomes.', tease: 'You start to influence what we make...', spots: 25, symbol: '\u266B' },
  { name: 'Einherjar', referrals: 12, unlock: 'Your name goes on something permanent.', tease: 'This one\'s permanent...', spots: 15, symbol: '\u2694' },
  { name: 'Jarl', referrals: 16, unlock: 'You choose your edition number. 001, 042, 300. Yours.', tease: 'You get to pick something nobody else can...', spots: 10, symbol: '\u2655' },
  { name: 'Muninn', referrals: 20, unlock: 'Direct access to Liam. You\'re in the inner circle.', tease: 'The founder knows your name...', spots: 5, symbol: '\u273B' },
  { name: 'Huginn', referrals: 25, unlock: 'Hand-signed card from Liam. Named in the founding story.', tease: 'You become part of the origin...', spots: 2, symbol: '\u2726' },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [waitlistCount, setWaitlistCount] = useState(FALLBACK_WAITLIST_COUNT)

  // Voting system — saves to Supabase via API
  const [woodVote, setWoodVote] = useState(() => localStorage.getItem('gebauer_wood_vote') || '')
  const [woodSubmitted, setWoodSubmitted] = useState(() => localStorage.getItem('gebauer_wood_submitted') === 'true')
  const [woodResults, setWoodResults] = useState({})
  const [pollResults, setPollResults] = useState({})

  // Generate a voter ID for preventing double votes
  const getVoterId = () => {
    let id = localStorage.getItem('gebauer_voter_id')
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('gebauer_voter_id', id) }
    return id
  }

  // Fetch vote results on mount
  useEffect(() => {
    fetch('/api/vote?poll=wood').then(r => r.json()).then(d => { if (d.results) setWoodResults(d.results) }).catch(() => {})
    // Fetch current design poll results
    const weekNum = Math.floor((Date.now() - new Date('2026-04-14').getTime()) / (7 * 24 * 60 * 60 * 1000))
    const pollIds = ['raven-caseback', 'clasp-style', 'box-design', 'interior-material']
    const currentPoll = pollIds[weekNum % pollIds.length]
    fetch(`/api/vote?poll=${currentPoll}`).then(r => r.json()).then(d => { if (d.results) setDesignPollResults(d.results) }).catch(() => {})
  }, [])

  const [pendingVote, setPendingVote] = useState('')
  const [designPollResults, setDesignPollResults] = useState({})

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
        // If already on waitlist, just log them in instead of showing error
        if (data.error && data.error.includes('already on the waitlist')) {
          localStorage.setItem('gebauer_email', email.trim().toLowerCase())
          localStorage.setItem('gebauer_name', firstName.trim())
          fetchStats(email.trim().toLowerCase())
          setShowSignup(false)
          if (pendingVote) { setWoodVote(pendingVote); setPendingVote('') }
          return
        }
        setError(data.error || 'Something went wrong.')
      } else {
        // Instant signup — no verification needed.
        localStorage.setItem('gebauer_email', email.trim().toLowerCase())
        localStorage.setItem('gebauer_name', firstName.trim())
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
        {/* Challenge banner */}
        <div className="l2-challenge fade-in">
          <p>No group chats. No mass shares. Tell one person at a time.</p>
        </div>

        {/* Identity */}
        <header className="l2-welcome">
          <img src={logo} alt="Gebauer" className="l2-logo" />
          <h1 className="l2-rank-hero fade-in">
            {userReferrals === 0
              ? <>You signed up.<br /><em>But you're not in yet.</em></>
              : <>You are <em>{currentRank.name}</em></>
            }
          </h1>
          <p className="l2-rank-detail fade-in-delay-1">
            {userReferrals === 0
              ? 'Bring 1 person to get inside.'
              : `${userReferrals} referral${userReferrals !== 1 ? 's' : ''}`
            }
          </p>
          <p className="l2-welcome-sub fade-in-delay-1">
            {userReferrals === 0
              ? `${displayName}, you're one of ${waitlistCount} people who found this. But the movement starts when you bring someone with you.`
              : `${displayName}, you're one of the first ${waitlistCount}. You're inside.`
            }
          </p>
        </header>

        {/* Referral link */}
        <section className="l2-referral fade-in-delay-1">
          <p className="l2-section-label">Your Link</p>
          <div className="l2-referral-box">
            <span className="l2-referral-url">
              {refCode ? `gebauerwatches.com/?ref=${refCode}` : 'Loading...'}
            </span>
            <button className="l2-copy-btn" onClick={handleCopyLink} disabled={!refCode}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="l2-referral-hint">
            {userReferrals === 0
              ? 'Tell one person. That\'s all it takes to get in.'
              : `Every person you bring in takes you deeper.`
            }
          </p>
        </section>

        {/* Gated content: insider access at 2+ referrals */}
        {userReferrals >= 2 && (
          <section className="l2-insider fade-in-delay-2">
            <p className="l2-section-label">Insider Access</p>
            <h3 className="l2-insider-title">Behind the scenes.</h3>
            <p className="l2-insider-text">Real emails between Liam and the manufacturers in Japan and Italy. What's actually being built and how.</p>
            <p className="l2-insider-note">Content drops when there's something real to show. You'll be first to see it.</p>
          </section>
        )}

        {userReferrals < 2 && userReferrals > 0 && (
          <section className="l2-insider-locked fade-in-delay-2">
            <p className="l2-section-label">Insider Access</p>
            <h3 className="l2-insider-title">Locked.</h3>
            <p className="l2-insider-text">Bring {2 - userReferrals} more {2 - userReferrals === 1 ? 'person' : 'people'} to see the real emails between Liam and the manufacturers in Japan and Italy.</p>
          </section>
        )}

        {/* Next rank */}
        {nextRank && (
          <section className="l2-next-rank fade-in-delay-2">
            <p className="l2-next-rank-text">
              {nextRank.referrals - userReferrals} more to become <strong>{nextRank.name}</strong>
            </p>
            <p className="l2-next-rank-tease">{nextRank.tease}</p>
          </section>
        )}

        {/* The Igdrasil — depth, not competition */}
        <section className="l2-igdrasil fade-in-delay-2">
          <h2 className="l2-igdrasil-title">The Igdrasil</h2>
          <p className="l2-igdrasil-sub">Go deeper.</p>
          <div className="l2-tree">
            {[...RAVEN_PATH].reverse().map((rank, i) => {
              const oi = RAVEN_PATH.length - 1 - i
              const isUnlocked = userReferrals >= rank.referrals
              const isCurrent = oi === currentRankIndex
              const isTop = oi === RAVEN_PATH.length - 1
              const isNextRank = oi === currentRankIndex + 1
              return (
                <div key={rank.name} className={`l2-tree-node ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current' : ''}`}>
                  {!isTop && <div className={`l2-tree-branch ${isUnlocked ? 'unlocked' : ''}`} />}
                  <div className="l2-tree-circle">{isUnlocked ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : <span className="l2-tree-dot" />}</div>
                  <div className="l2-tree-info">
                    <div className="l2-tree-rank-row">
                      <h3 className="l2-tree-rank-name">{(isUnlocked || isCurrent || isNextRank) ? rank.name : '???'}</h3>
                      <span className="l2-tree-referrals">{(isUnlocked || isCurrent) ? (rank.referrals === 0 ? 'Start' : `${rank.referrals}`) : isNextRank ? rank.referrals : ''}</span>
                    </div>
                    <p className="l2-tree-unlock">{(isUnlocked || isCurrent) ? rank.unlock : isNextRank ? rank.tease : 'Something awaits...'}</p>
                    {rank.spots && (isUnlocked || isCurrent || isNextRank) && <span className="l2-tree-spots">{rank.spots} spots</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <footer className="l2-footer"><button className="l2-back" onClick={() => setLayer('landing')}>Back to home</button><p>&copy; {new Date().getFullYear()} Gebauer Watches</p></footer>
      </div>
    )
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
          <a href="#vote" className="nav-link">Vote</a>
          <button className="nav-link" onClick={() => setShowStats(true)}>My Stats</button>
          <button className="nav-link nav-link-primary" onClick={() => setShowSignup(true)}>Get In</button>
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
            <a href="#vote" className="nav-link">Vote</a>
              <button className="nav-link" onClick={() => { setMenuOpen(false); setShowStats(true) }}>My Stats</button>
            <button className="nav-link nav-link-primary" onClick={() => { setMenuOpen(false); setShowSignup(true) }}>Get In</button>
          </div>
        )}
      </nav>

      {/* 1. HERO — emotional hook */}
      <section className="hero">
        <video className="hero-video" src={heroVideo} autoPlay muted loop playsInline />
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-headline fade-in">
            No two have ever
            <span className="hero-accent"> been the same.</span>
          </h1>
          <p className="hero-sub fade-in-delay-1">Because the moments they mark aren't either.</p>
          <div className="hero-buttons fade-in-delay-2">
            <a href="#watches" className="hero-cta-btn">Vote For Your Watch</a>
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-hint-line" /></div>
      </section>

      {/* 2. SET THE SCENE — Liam's origin */}
      <Reveal className="story-beat story-milan" id="story">
        <img src={milanBg} alt="" className="story-milan-bg" />
        <div className="story-milan-overlay" />
        <div className="story-beat-inner story-beat-over">
          <h2 className="story-beat-headline">I bought my first watch to get off my phone.</h2>
          <p className="story-beat-text">Milan. Age 13. I walked into a Seiko store and spent 310 euros on a watch I'd saved up for. For the first time, I could check the time without getting pulled into a screen. It changed everything.</p>
          <p className="story-beat-signoff">— Liam, 14. Steamboat Springs, Colorado.</p>
        </div>
      </Reveal>

      {/* 3. THE CHALLENGE — no milestone gift that lands */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">There's no milestone gift that lands anymore.</h2>
          <p className="story-beat-text">Girls have Pandora, Tiffany, jewelry that marks the moment. For guys? Class rings no one wears. Gift cards that get spent and forgotten. Nothing that says "this moment mattered." I talked to 60+ teens at my school. They all felt the same way.</p>
        </div>
      </Reveal>

      {/* 4. THE PIT — the stat that proves it */}
      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline story-stat">65% of teens used to buy class rings. Today it's under 30%.</h2>
          <p className="story-beat-text">Parents still spend $461 on average for milestone gifts. The money is there. The intention is there. The right gift isn't. Parents, grandparents, aunts and uncles want to give something that lasts. Teens want something they'll actually wear.</p>
        </div>
      </Reveal>

      {/* 5. THE WISE MENTOR — Gebauer is the answer */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">So I found a manufacturer in Japan and started building the answer.</h2>
          <p className="story-beat-text">Every Gebauer watch has a dial cut from real wood. Sapphire crystal. Japanese movement. 316L stainless steel. 300 ever made, each one numbered. A watch built for the moments that change everything.</p>
          <p className="story-beat-accent">No two have ever been the same.</p>
        </div>
      </Reveal>

      {/* 6. THE AGING STORY — the watch grows with you */}
      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">It becomes part of you.</h2>
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
          <p className="story-beat-text">African Padauk shifts from fiery orange to deep burgundy over years. The wood deepens, the grain evolves, and every mark it picks up along the way is yours. Your watch at graduation won't look like your watch at 25.</p>
        </div>
      </Reveal>

      {/* 7. THE RESOLUTION — the gift that works for everyone */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <h2 className="story-beat-headline">Teens get something they actually want to wear. Adults get to give something that lasts.</h2>
          <p className="story-beat-text">The moment gets marked by a gift that grows with the person who received it. Not a gift card. Not a class ring. Something real, on their wrist, every day.</p>
        </div>
      </Reveal>

      {/* 8. VOTE — story is done, now act */}
      <Reveal className="story-beat story-dark" id="watches">
        <div className="story-beat-inner" style={{maxWidth: 960}}>
          <h2 className="story-beat-headline" style={{textAlign: 'center', marginBottom: 16}}>And no two ever will.</h2>
          <p className="story-beat-text" style={{textAlign: 'center', marginBottom: 48}}>Choose yours.</p>
          <div className="wood-grid">
            {[
              { id: 'padauk', img: watchPadauk, name: 'African Padauk', desc: 'Starts orange. Darkens to deep burgundy over years. The only watch dial that changes color with time.' },
              { id: 'ebony', img: watchEbony, name: 'Black Ebony', desc: 'Rarer than gold in ancient Egypt. Nearly black. Razor-thin grain. Permanent.' },
              { id: 'hinoki', img: watchHinoki, name: 'Hinoki', desc: 'Sacred Japanese wood. Built temples for a thousand years. Soft golden grain.' },
            ].map(w => (
              <div key={w.id} className={`wood-card ${woodVote === w.id ? 'voted' : ''}`}>
                <div className="wood-card-img"><img src={w.img} alt={w.name} /></div>
                <h3>{w.name}</h3>
                <p>{w.desc}</p>
                {!woodSubmitted && (
                  <button className={`wood-vote-btn ${woodVote === w.id ? 'active' : ''}`} onClick={() => handleWoodVote(w.id)}>
                    {woodVote === w.id ? 'Your pick' : 'This one'}
                  </button>
                )}
              </div>
            ))}
          </div>
          {!woodSubmitted && woodVote && (
            <button className="wood-submit-btn" onClick={handleWoodSubmit}>Lock In My Pick</button>
          )}
          {woodSubmitted && (() => {
            const total = Object.values(woodResults).reduce((a, b) => a + b, 0) || 1
            return (
              <div className="wood-results">
                {['padauk', 'ebony', 'hinoki'].map(w => {
                  const count = woodResults[w] || 0
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div key={w} className={`wood-result-bar ${woodVote === w ? 'voted' : ''}`}>
                      <span className="wood-result-name">{w === 'padauk' ? 'Padauk' : w === 'ebony' ? 'Ebony' : 'Hinoki'}</span>
                      <div className="wood-result-track"><div className="wood-result-fill" style={{width: `${pct}%`}} /></div>
                      <span className="wood-result-pct">{pct}%</span>
                    </div>
                  )
                })}
                <p className="wood-result-total">{total} vote{total !== 1 ? 's' : ''}</p>
              </div>
            )
          })()}
        </div>
      </Reveal>

      {/* 9. THE INVITATION */}
      <Reveal className="story-beat story-cream story-center">
        <div className="story-beat-inner">
          <h2 className="story-beat-headline">{waitlistCount} people are already in.</h2>
          <p className="story-beat-text">They believed before they could see it. Before they could hold it. First drop ships December 2026. Every watch numbered. Once they're gone, they're gone.</p>
          <div className="invitation-buttons">
            <button className="story-cta" onClick={() => setShowSignup(true)}>Get In</button>
            <button className="story-share" onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Gebauer Watches', text: 'Real wood dials. Japanese craft. 300 ever made. A Gebauer is just the beginning.', url: 'https://gebauerwatches.com' })
              } else {
                navigator.clipboard.writeText('https://gebauerwatches.com')
                const btn = document.querySelector('.story-share')
                btn.textContent = 'Link Copied'
                setTimeout(() => { btn.textContent = 'Share Gebauer' }, 2000)
              }
            }}>Share Gebauer</button>
          </div>
        </div>
      </Reveal>

      {/* FOOTER */}
      <footer className="site-footer">
        <img src={logo} alt="Gebauer" className="footer-logo" />
        <p className="footer-tagline">Crafted in Japan. Built to age with you.</p>
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
