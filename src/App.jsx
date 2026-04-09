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
            <h3 className="l2-leaderboard-title">Top Referrers</h3>
            <div className="l2-leaderboard-list">{leaderboard.slice(0, 5).map((p, i) => <div key={p.name + i} className="l2-leaderboard-row"><span className="l2-leaderboard-pos">{i+1}</span><span className="l2-leaderboard-name">{p.name}</span><span className="l2-leaderboard-count">{p.referrals}</span></div>)}</div>
          </section>
        )}
        <footer className="l2-footer"><button className="l2-back" onClick={() => setLayer('landing')}>Back to home</button><p>&copy; {new Date().getFullYear()} Gebauer Watches</p></footer>
      </div>
    )
  }

  // ---- LAYER 1 ----
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <video className="hero-video" src={heroVideo} autoPlay muted loop playsInline />
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-headline fade-in">
            Built by Teens,
            <span className="hero-accent"> For Teens.</span>
          </h1>
          <p className="hero-sub fade-in-delay-1">300 watches. Real wood dials. Made in Japan. The first drop is December 2026. You found this first.</p>
          <div className="hero-cta fade-in-delay-1">
            <button className="hero-join-btn" onClick={() => setShowSignup(true)}>Get In</button>
            <button className="hero-stats-btn" onClick={() => setShowStats(true)}>My Stats</button>
            <p className="hero-proof">{waitlistCount} already in. {300 - waitlistCount} spots left.</p>
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-hint-line" /></div>
      </section>

      {/* WHY GEBAUER: 4 quick punches */}
      <Reveal className="why">
        <div className="why-inner">
          <div className="why-item">
            <h3>300. That's the drop.</h3>
            <p>Numbered. Engraved. Then we move on to the next chapter.</p>
          </div>
          <div className="why-item">
            <h3>Built by a 16 year old.</h3>
            <p>Not endorsed. Not consulted. Designed.</p>
          </div>
          <div className="why-item">
            <h3>Real wood. Made in Japan.</h3>
            <p>Three variants. The grain on yours isn't on anyone else's.</p>
          </div>
          <div className="why-item">
            <h3>December 2026.</h3>
            <p>The first watches ship. You're in or you're watching.</p>
          </div>
        </div>
      </Reveal>

      {/* THE PRIZE: #1 gets the first watch */}
      <Reveal className="prize">
        <div className="prize-inner">
          <p className="prize-label">The Race to #1</p>
          <h2 className="prize-headline">
            Watch <em>001</em> goes to whoever ends up at the top.
          </h2>
          <p className="prize-text">
            When the first 300 ship in December, <strong>001/300</strong> goes to the #1 spot on this list. The first watch off the line. Engraved before any other. The leaderboard closes June 30.
          </p>
          {leaderboard.length > 0 && (
            <div className="prize-leaderboard">
              <p className="prize-leaderboard-label">The Leaderboard</p>
              <div className="prize-leaderboard-list">
                {leaderboard.map((person, i) => (
                  <div key={person.name + i} className={`prize-row ${i === 0 ? 'first' : ''}`}>
                    <span className="prize-row-pos">{i + 1}</span>
                    <span className="prize-row-name">{person.name}</span>
                    <span className="prize-row-refs">{person.referrals}</span>
                    <span className="prize-row-label">{person.referrals === 1 ? 'referral' : 'referrals'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="prize-actions">
            <button className="prize-cta" onClick={() => setShowSignup(true)}>Get In</button>
            <button className="prize-stats-btn" onClick={() => setShowStats(true)}>Check My Stats</button>
          </div>
        </div>
      </Reveal>

      {/* FOUNDER: signed note from Liam */}
      <Reveal className="founder">
        <div className="founder-inner">
          <RavenIcon className="section-raven" size={24} />
          <p className="founder-label">From Liam</p>
          <h2 className="founder-headline">
            I'm 16. I started Gebauer because <em>nothing in this category was made for us.</em>
          </h2>
          <p className="founder-text">
            I bought my first real watch in Milan with money I'd saved up for months. The second it was on my wrist I noticed nobody my age had anything close. Watches that actually had weight to them were all built by old guys, for old guys. Everything aimed at us was plastic and disposable.
          </p>
          <p className="founder-text">
            So I started learning. Movements, materials, manufacturers. Spent months pitching factories until one in Japan said yes. A year later we have three wood variants locked, the youngest founder in the High Country Accelerator, and 300 watches on the way.
          </p>
          <p className="founder-text">
            Gebauer is going to be a movement. This drop is just the first chapter, and the people in it are the reason any of the chapters after exist.
          </p>
          <p className="founder-signoff">— Liam, 16</p>
          <div className="founder-stats">
            <div className="founder-stat"><span className="founder-stat-num">2hrs/day</span><span className="founder-stat-label">after school, every day</span></div>
            <div className="founder-stat"><span className="founder-stat-num">60+</span><span className="founder-stat-label">teens interviewed</span></div>
            <div className="founder-stat"><span className="founder-stat-num">Japan</span><span className="founder-stat-label">manufacturing partner</span></div>
          </div>
        </div>
      </Reveal>

      {/* THE WOOD: story-driven */}
      <Reveal className="wood">
        <h2 className="wood-headline">Three woods. <em>Three stories.</em></h2>
        <p className="wood-sub">Real wood dials. Cut, not printed. The grain on yours isn't on anyone else's because grain doesn't repeat. That's the whole thing.</p>
        <div className="wood-grid">
          <div className="wood-card">
            <div className="wood-img-wrap"><img src={watchPadauk} alt="African Padauk" /></div>
            <h3>African Padauk</h3>
            <p className="wood-tagline">Ages in real time.</p>
            <p className="wood-fact">Starts fiery orange. Over years, the wood deepens into burgundy on its own. The dial you see now isn't the dial you'll see in five years. It's the only watch on the planet that changes color with time.</p>
          </div>
          <div className="wood-card">
            <div className="wood-img-wrap"><img src={watchEbony} alt="Black Ebony" /></div>
            <h3>Black Ebony</h3>
            <p className="wood-tagline">Rarer than gold. Once.</p>
            <p className="wood-fact">Nearly black, with razor-thin grain lines that catch light from certain angles. One of the densest woods on earth. In ancient Egypt it was rarer than gold. The flex is quiet.</p>
          </div>
          <div className="wood-card">
            <div className="wood-img-wrap"><img src={watchHinoki} alt="Hinoki" /></div>
            <h3>Hinoki</h3>
            <p className="wood-tagline">Sacred wood. Real one.</p>
            <p className="wood-fact">Hinoki built Japanese temples for over a thousand years. The forests are protected by law. Soft golden grain. The kind of detail people only notice if they're really looking, which is the point.</p>
          </div>
        </div>
      </Reveal>

      {/* WHERE WE ARE NOW */}
      <Reveal className="journey">
        <div className="journey-inner">
          <RavenIcon className="section-raven section-raven-gold" size={24} />
          <p className="journey-label">The Countdown</p>
          <h2 className="journey-headline">First drop. <em>December 2026.</em></h2>
          <div className="journey-timeline">
            <div className="journey-item journey-done">
              <span className="journey-marker">&#10003;</span>
              <div><h3>The Design is Locked</h3><p>Three woods. Raven caseback. Every detail signed off.</p></div>
            </div>
            <div className="journey-item journey-done">
              <span className="journey-marker">&#10003;</span>
              <div><h3>The Partner is Signed</h3><p>Manufacturer in Japan. Tokiji is producing the official technical drawings right now.</p></div>
            </div>
            <div className="journey-item journey-active">
              <span className="journey-marker-active" />
              <div><h3>Samples This Summer</h3><p>Real watches in hand. First time anyone outside the team gets to see them.</p></div>
            </div>
            <div className="journey-item journey-active">
              <span className="journey-marker-active" />
              <div><h3>The First 300 Drop in December</h3><p>Numbered, engraved, and shipped to whoever made it onto the list in time.</p></div>
            </div>
          </div>
          <p className="journey-cta-text">After this drop, the next chapter starts. You want to be in the first one.</p>
        </div>
      </Reveal>

      {/* UPDATES */}
      <Reveal className="updates">
        <div className="updates-inner">
          <p className="updates-label">Latest</p>
          <div className="updates-card">
            <span className="updates-date">April 2026</span>
            <h3 className="updates-title">Liam is the youngest founder in the High Country Accelerator</h3>
            <p className="updates-desc">
              Gebauer got into the spring cohort in Steamboat Springs. Most founders in the room are 30+. Liam is 16. The accelerator is how we go from 300 watches to whatever Gebauer becomes after.
            </p>
          </div>
        </div>
      </Reveal>

      {/* IGDRASIL: Norse World Tree */}
      <Reveal className="community">
        <div className="community-inner">
          <h2 className="community-headline">The Igdrasil. <em>Climb it.</em></h2>
          <p className="community-text">8 ranks pulled from Norse myth. Refer friends, move up the tree. The person at the top when we ship gets watch 001.</p>

          <div className="world-tree">
            {/* SVG tree trunk and branches */}
            <svg className="tree-svg" viewBox="0 0 200 720" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              {/* Roots */}
              <path d="M100 720 Q80 700 60 710 Q40 720 20 715" stroke="var(--purple-mid)" strokeWidth="2" opacity="0.3" />
              <path d="M100 720 Q120 700 140 710 Q160 720 180 715" stroke="var(--purple-mid)" strokeWidth="2" opacity="0.3" />
              <path d="M100 720 Q90 705 70 700" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.2" />
              <path d="M100 720 Q110 705 130 700" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.2" />
              {/* Main trunk */}
              <path d="M100 720 Q98 600 100 480 Q102 360 100 240 Q98 120 100 20" stroke="url(#trunk-gradient)" strokeWidth="4" strokeLinecap="round" />
              {/* Branches (alternating sides, growing from trunk to nodes) */}
              <path d="M100 630 Q70 625 50 620" stroke="var(--purple-mid)" strokeWidth="2" opacity="0.25" />
              <path d="M100 540 Q130 535 155 530" stroke="var(--purple-mid)" strokeWidth="2" opacity="0.25" />
              <path d="M100 450 Q65 440 45 435" stroke="var(--purple-mid)" strokeWidth="2" opacity="0.25" />
              <path d="M100 360 Q135 352 158 345" stroke="var(--purple-mid)" strokeWidth="2" opacity="0.2" />
              <path d="M100 270 Q62 258 42 250" stroke="var(--purple-mid)" strokeWidth="2" opacity="0.2" />
              <path d="M100 185 Q140 178 160 172" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.15" />
              <path d="M100 105 Q65 95 48 88" stroke="var(--purple-mid)" strokeWidth="1.5" opacity="0.15" />
              {/* Crown/canopy hint at top */}
              <path d="M100 20 Q80 5 60 10" stroke="var(--gold-muted)" strokeWidth="1.5" opacity="0.2" />
              <path d="M100 20 Q120 5 140 10" stroke="var(--gold-muted)" strokeWidth="1.5" opacity="0.2" />
              <path d="M100 20 Q90 -5 75 0" stroke="var(--gold-muted)" strokeWidth="1" opacity="0.15" />
              <path d="M100 20 Q110 -5 125 0" stroke="var(--gold-muted)" strokeWidth="1" opacity="0.15" />
              <defs>
                <linearGradient id="trunk-gradient" x1="100" y1="720" x2="100" y2="20" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.5" />
                  <stop offset="60%" stopColor="var(--purple-glow)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--purple-mid)" stopOpacity="0.15" />
                </linearGradient>
              </defs>
            </svg>

            {/* Rank nodes positioned over the tree */}
            <div className="tree-nodes">
              {[...RAVEN_PATH].reverse().map((rank, i) => {
                const originalIndex = RAVEN_PATH.length - 1 - i
                const isReached = originalIndex <= currentRankIndex
                const isActive = originalIndex === currentRankIndex
                const isTop = originalIndex === RAVEN_PATH.length - 1
                const isBottom = originalIndex === 0
                const side = originalIndex % 2 === 0 ? 'left' : 'right'

                return (
                  <div
                    key={rank.name}
                    className={`tree-node ${isReached ? 'reached' : 'locked'} ${isActive ? 'active' : ''} ${side}`}
                  >
                    <div className="tree-node-orb">
                      <span className="tree-node-symbol">{rank.symbol}</span>
                      {isActive && <div className="tree-node-pulse" />}
                    </div>
                    <div className="tree-node-info">
                      <h3 className="tree-node-name">{rank.name}</h3>
                      <span className="tree-node-refs">
                        {rank.referrals === 0 ? 'Join' : `${rank.referrals} referrals`}
                      </span>
                      <p className="tree-node-unlock">{rank.unlock}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <button className="community-cta" onClick={() => setShowSignup(true)}>Get In</button>
          <p className="community-proof">{waitlistCount} already in. {300 - waitlistCount} spots left.</p>
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
