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
import watchPadauk from './assets/image1-1.jpeg'
import padaukAged from './assets/padauk-aged.jpeg'
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
      } else {
        // Instant signup — no verification needed. Go straight to inside.
        localStorage.setItem('gebauer_email', email.trim().toLowerCase())
        localStorage.setItem('gebauer_name', firstName.trim())
        fetchStats(email.trim().toLowerCase())
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
      {/* NAV */}
      <nav className="site-nav">
        <a href="/" className="nav-logo"><img src={logo} alt="Gebauer" /></a>
        <button className="nav-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span className={`nav-bar ${menuOpen ? 'open' : ''}`} />
          <span className={`nav-bar ${menuOpen ? 'open' : ''}`} />
          <span className={`nav-bar ${menuOpen ? 'open' : ''}`} />
        </button>
        {menuOpen && (
          <div className="nav-dropdown" onClick={() => setMenuOpen(false)}>
            <a href="#story" className="nav-link">The Story</a>
            <a href="#watches" className="nav-link">The Watches</a>
            <a href="#perks" className="nav-link">Perks</a>
            <a href="#path" className="nav-link">Raven Path</a>
            <a href="#vote" className="nav-link">Vote</a>
            <a href="/blog" className="nav-link" onClick={() => window.location.href = '/blog'}>Blog</a>
            <button className="nav-link nav-link-cta" onClick={() => { setMenuOpen(false); setShowStats(true) }}>My Stats</button>
            <button className="nav-link nav-link-cta nav-link-primary" onClick={() => { setMenuOpen(false); setShowSignup(true) }}>Get In</button>
          </div>
        )}
      </nav>

      {/* 1. HERO — video background */}
      <section className="hero">
        <video className="hero-video" src={heroVideo} autoPlay muted loop playsInline />
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-headline fade-in">
            A Gebauer is just
            <span className="hero-accent"> the beginning.</span>
          </h1>
          <p className="hero-sub fade-in-delay-1">Real wood. Japanese craft. 300 ever made. The watch that becomes part of you.</p>
          <div className="hero-buttons fade-in-delay-2">
            <button className="hero-cta-btn" onClick={() => setShowSignup(true)}>Get In</button>
            <button className="hero-stats-btn" onClick={() => setShowStats(true)}>My Stats</button>
          </div>
          <p className="hero-count fade-in-delay-2">{waitlistCount} already in. {300 - waitlistCount} spots left.</p>
        </div>
        <div className="scroll-hint"><div className="scroll-hint-line" /></div>
      </section>

      {/* 2. THE STORY — Milan */}
      <Reveal className="story-beat story-milan" id="story">
        <img src={milanBg} alt="" className="story-milan-bg" />
        <div className="story-milan-overlay" />
        <div className="story-beat-inner story-beat-over">
          <h2 className="story-beat-headline">I walked into a watch shop in Milan at 13 and spent 310 euros on a Seiko I couldn't afford.</h2>
          <p className="story-beat-text">Most expensive thing I'd ever bought. But the second it was on my wrist I knew every cent was worth it. I went home and spent the next year learning everything about how watches are made, who makes the best ones, and why nothing like this existed for people my age.</p>
        </div>
      </Reveal>

      {/* 3. THE REALIZATION */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner">
          <h2 className="story-beat-headline">Then I noticed something nobody else did.</h2>
          <p className="story-beat-text">There's no watch for people my age that actually means something. Nothing that marks the moments that matter. Nothing that ages with you, changes with you, becomes yours in a way that nothing else can. So I found a manufacturer in Japan and started building one.</p>
          <p className="story-beat-signoff">— Liam, 14. Steamboat Springs, Colorado.</p>
        </div>
      </Reveal>

      {/* 4. THE WATCH — product reveal */}
      <Reveal className="story-beat story-cream">
        <div className="story-product">
          <div className="story-product-img">
            <img src={padaukAged} alt="Gebauer watch with aged Padauk wood dial" />
          </div>
          <div className="story-product-text">
            <h2 className="story-beat-headline">Real wood. Real steel. Changes every year.</h2>
            <p className="story-beat-text">Every dial is cut from actual wood. African Padauk that shifts from fiery orange to deep burgundy over time. Sapphire crystal. Japanese movement. 316L steel. Raven engraved on the caseback. 300 ever made per edition, each one numbered.</p>
            <p className="story-beat-accent">No two have ever been the same.</p>
          </div>
        </div>
      </Reveal>

      {/* 6. THE PROOF — three woods */}
      <Reveal className="story-beat story-dark" id="watches">
        <div className="story-beat-inner" style={{maxWidth: 960}}>
          <h2 className="story-beat-headline" style={{textAlign: 'center', marginBottom: 48}}>Three woods. Each one tells a different story.</h2>
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
          {woodSubmitted && (
            <div className="wood-vote-confirmed">
              {woodVote === 'padauk' && <p>Padauk. A watch that tells a different story every year. Respect.</p>}
              {woodVote === 'ebony' && <p>Ebony. The rarest one. You know exactly what you want.</p>}
              {woodVote === 'hinoki' && <p>Hinoki. Sacred Japanese wood on your wrist. That's a quiet flex nobody else would think of.</p>}
              <span className="wood-vote-check">Vote recorded</span>
            </div>
          )}
        </div>
      </Reveal>

      {/* 7. THE RAVEN */}
      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{textAlign: 'center'}}>
          <img src={ravenMinimal} alt="Raven caseback" style={{width: 100, opacity: 0.6, marginBottom: 24}} />
          <h2 className="story-beat-headline story-beat-italic">A Gebauer never forgets.</h2>
          <p className="story-beat-text">A raven engraved on every caseback. Huginn, from Norse mythology, who fought forgetfulness. Only the wearer knows it's there.</p>
        </div>
      </Reveal>

      {/* 8. THE MANIFESTO */}
      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner">
          <h2 className="story-beat-headline">The Gebauer Manifesto.</h2>
          <div className="manifesto-list">
            <div className="manifesto-item">
              <h3>The beauty is already in the wood.</h3>
              <p>We don't add to it, cover it, or customize it. The grain is the design. Nature did the work.</p>
            </div>
            <div className="manifesto-item">
              <h3>It's meant to be worn, not preserved.</h3>
              <p>Scratches, patina, darkening grain. That's not damage. That's your story showing up.</p>
            </div>
            <div className="manifesto-item">
              <h3>Crafted in Japan by hand.</h3>
              <p>Not assembled. Crafted. By people who've been doing this for decades.</p>
            </div>
            <div className="manifesto-item">
              <h3>Every one is different.</h3>
              <p>Not because we engineered variation. Because wood is wood. No two pieces have ever looked the same.</p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 9. DESIGN INPUT — help us decide */}
      {(() => {
        const POLLS = [
          {
            id: 'raven-caseback',
            question: "Which raven belongs on the caseback?",
            context: "Every Gebauer has a raven engraved on the back. We're deciding the style.",
            options: [
              { id: 'simple', label: 'Simple', desc: 'Clean outline with talons. Bold and readable.', img: ravenSimple },
              { id: 'minimal', label: 'Minimal', desc: 'Streamlined, no talons. Subtle.', img: ravenMinimal },
            ],
          },
          {
            id: 'clasp-style',
            question: "Butterfly clasp or deployant?",
            context: "The clasp is what you touch every time you put the watch on.",
            options: [
              { id: 'butterfly', label: 'Butterfly', desc: 'Folds from both sides. Clean when closed.', img: claspButterfly },
              { id: 'deployant', label: 'Deployant', desc: 'Single fold with push button release.', img: claspDeployed },
            ],
          },
          {
            id: 'box-design',
            question: "Which box do you want to open?",
            context: "The unboxing is the first impression.",
            options: [
              { id: 'debossed', label: 'Debossed', desc: 'Pressed logo, no color. Understated.', img: boxDebossed },
              { id: 'gold-logo', label: 'Gold Logo', desc: 'Gold G on green. Bolder.', img: boxGoldLogo },
            ],
          },
          {
            id: 'interior-material',
            question: "Suede or microfiber inside the box?",
            context: "The interior is what touches the watch.",
            options: [
              { id: 'suede', label: 'Suede', desc: 'Warm, textured, classic luxury feel.', img: interiorSuede },
              { id: 'microfiber', label: 'Microfiber', desc: 'Smooth, modern, protects the crystal.', img: interiorMicrofiber },
            ],
          },
        ]

        const weekNum = Math.floor((Date.now() - new Date('2026-04-14').getTime()) / (7 * 24 * 60 * 60 * 1000))
        const poll = POLLS[weekNum % POLLS.length]
        const voteKey = `gebauer_vote_${poll.id}`
        const voted = localStorage.getItem(voteKey) || ''

        return (
          <Reveal className="story-beat story-cream" id="vote">
            <div className="story-beat-inner" style={{maxWidth: 520}}>
              <p className="vote-label">Help Us Decide</p>
              <h2 className="story-beat-headline">{poll.question}</h2>
              <p className="story-beat-text">{poll.context}</p>
              <div className="vote-options">
                {poll.options.map(opt => {
                  const isSelected = voted === opt.id
                  return (
                    <button
                      key={opt.id}
                      className={`vote-opt ${isSelected ? 'selected' : ''} ${voted ? 'revealed' : ''}`}
                      onClick={() => {
                        if (voted) return
                        localStorage.setItem(voteKey, opt.id)
                        window.location.hash = 'vote'
                        window.location.reload()
                      }}
                      disabled={!!voted}
                    >
                      <div className="vote-opt-img">
                        <img src={opt.img} alt={opt.label} />
                      </div>
                      <div>
                        <h3>{opt.label}</h3>
                        <p>{opt.desc}</p>
                      </div>
                      {voted && isSelected && (
                        <p className="vote-picked">Your pick</p>
                      )}
                    </button>
                  )
                })}
              </div>
              {voted && <p className="vote-thanks">Your vote is in. New poll drops next week.</p>}
              {!voted && <p className="vote-hint">Your vote shapes the final design.</p>}
            </div>
          </Reveal>
        )
      })()}

      {/* 10. THE INVITATION */}
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
