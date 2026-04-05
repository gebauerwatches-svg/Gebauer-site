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

const TESTIMONIALS = [
  { quote: "The wood dial is something I've never seen before. Knowing there are only 300 makes it hit different.", name: 'Aiden', rank: 'Jarl', referrals: 19, position: 3 },
  { quote: 'I showed one friend and it just spread. This community is real.', name: 'Carson', rank: 'Jarl', referrals: 17, position: 5 },
  { quote: "I'm picking my edition number early. That's the kind of thing that makes you feel like you matter to a brand.", name: 'Sam', rank: 'Jarl', referrals: 16, position: 7 },
]

const DEMO_USER = { firstName: 'Liam', referralCode: 'GEBAUER-LG42', referralCount: 3 }
const DEMO_LEADERBOARD = [
  { name: 'Loke', referrals: 79 }, { name: 'Maya', referrals: 12 },
  { name: 'James', referrals: 8 }, { name: 'Ava', referrals: 5 }, { name: 'Finn', referrals: 4 },
]
const WAITLIST_COUNT = 152

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


function App() {
  const [layer, setLayer] = useState('landing')
  const [showSignup, setShowSignup] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (honeypot) return
    setError('')
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      setLayer('inside')
      setShowSignup(false)
    } catch (err) { setError(err.message || 'Something went wrong') }
    finally { setLoading(false) }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://waitlist.gebauerwatches.com/?ref=${DEMO_USER.referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const userReferrals = DEMO_USER.referralCount
  let currentRankIndex = 0
  for (let i = RAVEN_PATH.length - 1; i >= 0; i--) {
    if (userReferrals >= RAVEN_PATH[i].referrals) { currentRankIndex = i; break }
  }
  const currentRank = RAVEN_PATH[currentRankIndex]
  const nextRank = RAVEN_PATH[currentRankIndex + 1] || null

  // ---- LAYER 2 ----
  if (layer === 'inside') {
    return (
      <div className="l2">
        <header className="l2-welcome">
          <img src={logo} alt="Gebauer" className="l2-logo" />
          <h1 className="l2-welcome-title fade-in">You're one of <em>The First 300.</em></h1>
          <p className="l2-welcome-sub fade-in-delay-1">The movement started with you.</p>
        </header>
        <section className="l2-referral fade-in-delay-1">
          <p className="l2-section-label">Your Referral Link</p>
          <div className="l2-referral-box">
            <span className="l2-referral-url">waitlist.gebauerwatches.com/?ref={DEMO_USER.referralCode}</span>
            <button className="l2-copy-btn" onClick={handleCopyLink}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <p className="l2-referral-hint">Every friend who joins moves you up The Igdrasil.</p>
        </section>
        {nextRank && (
          <section className="l2-next-rank fade-in-delay-2">
            <p className="l2-next-rank-text">You're a <strong>{currentRank.name}</strong>. Refer {nextRank.referrals - userReferrals} more to become <strong>{nextRank.name}</strong>.</p>
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
        <section className="l2-leaderboard fade-in-delay-3">
          <h3 className="l2-leaderboard-title">Top Referrers</h3>
          <div className="l2-leaderboard-list">{DEMO_LEADERBOARD.map((p, i) => <div key={p.name} className="l2-leaderboard-row"><span className="l2-leaderboard-pos">{i+1}</span><span className="l2-leaderboard-name">{p.name}</span><span className="l2-leaderboard-count">{p.referrals}</span></div>)}</div>
        </section>
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
            Built by teens, for teens.
            <span className="hero-accent"> Because we're different.</span>
          </h1>
          <div className="hero-cta fade-in-delay-1">
            <button className="hero-join-btn" onClick={() => setShowSignup(true)}>Join the Movement</button>
            <p className="hero-proof">{WAITLIST_COUNT} people are already in.</p>
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-hint-line" /></div>
      </section>

      {/* WATCH SHOWCASE: full-width, visual-first */}
      <Reveal className="showcase">
        <div className="showcase-watches">
          <div className="showcase-watch">
            <img src={watchPadauk} alt="African Padauk" />
            <div className="showcase-info">
              <h3>Padauk</h3>
              <p>Fiery orange to deep burgundy. It transforms with you.</p>
              <span>$375</span>
            </div>
          </div>
          <div className="showcase-watch showcase-center">
            <img src={watchEbony} alt="Black Ebony" />
            <div className="showcase-info">
              <h3>Ebony</h3>
              <p>Jet black. Razor-sharp grain. Permanent.</p>
              <span>$339</span>
            </div>
          </div>
          <div className="showcase-watch">
            <img src={watchHinoki} alt="Hinoki" />
            <div className="showcase-info">
              <h3>Hinoki</h3>
              <p>Japanese cypress. Subtle golden grain. Sacred wood.</p>
              <span>$299</span>
            </div>
          </div>
        </div>
        <p className="showcase-specs">Real wood dials. Miyota quartz. Sapphire crystal. 316L steel. Raven caseback. 001/300.</p>
      </Reveal>

      {/* FOUNDER: short, punchy, visual */}
      <Reveal className="founder">
        <div className="founder-inner">
          <RavenIcon className="section-raven" size={24} />
          <h2 className="founder-headline">
            Most watch brands are run by old guys in suits.
            <em> Ours was founded by a teenager.</em>
          </h2>
          <div className="founder-stats">
            <div className="founder-stat"><span className="founder-stat-num">2hrs/day</span><span className="founder-stat-label">after school, every day</span></div>
            <div className="founder-stat"><span className="founder-stat-num">60+</span><span className="founder-stat-label">teen interviews</span></div>
            <div className="founder-stat"><span className="founder-stat-num">Japan</span><span className="founder-stat-label">manufacturing</span></div>
          </div>
          <p className="founder-text">
            Liam bought his first real watch in Milan at 15. A year later he was designing his own with a manufacturer in Japan. Gebauer is what happens when a teen builds the watch brand that didn't exist yet.
          </p>
        </div>
      </Reveal>

      {/* UPDATES */}
      <Reveal className="updates">
        <div className="updates-inner">
          <p className="updates-label">Latest</p>
          <div className="updates-card">
            <span className="updates-date">April 2026</span>
            <h3 className="updates-title">Liam Accepted into High Country Accelerator</h3>
            <p className="updates-desc">
              Gebauer was selected for the High Country Accelerator spring cohort in Steamboat Springs.
              Liam is the youngest founder in the program. The accelerator connects Gebauer with mentors,
              investors, and the resources to scale from 300 watches to a real brand.
            </p>
          </div>
        </div>
      </Reveal>

      {/* WOOD: big visuals, minimal text */}
      <Reveal className="wood">
        <h2 className="wood-headline">The wood is <em>the whole point.</em></h2>
        <p className="wood-sub">Every dial is cut from real wood. No prints. No veneers. No two are alike.</p>
        <div className="wood-grid">
          <div className="wood-card">
            <div className="wood-img-wrap"><img src={watchPadauk} alt="Padauk grain" /></div>
            <h3>African Padauk</h3>
            <p className="wood-tagline">Starts orange. Ages to burgundy.</p>
            <p className="wood-fact">The dial will look completely different in 5 years. It tells your story.</p>
          </div>
          <div className="wood-card">
            <div className="wood-img-wrap"><img src={watchEbony} alt="Ebony grain" /></div>
            <h3>Black Ebony</h3>
            <p className="wood-tagline">Permanent. Timeless. Never fades.</p>
            <p className="wood-fact">One of the densest woods on earth. Rarer than gold in ancient Egypt.</p>
          </div>
          <div className="wood-card">
            <div className="wood-img-wrap"><img src={watchHinoki} alt="Hinoki grain" /></div>
            <h3>Hinoki</h3>
            <p className="wood-tagline">Sacred Japanese cypress.</p>
            <p className="wood-fact">Used to build temples for 1,000+ years. Forests protected by law.</p>
          </div>
        </div>
      </Reveal>

      {/* TESTIMONIALS: compact */}
      <Reveal className="testimonials">
        <h2 className="testimonials-headline">From The First 300.</h2>
        <div className="testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-avatar"><span>{t.name[0]}</span></div>
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-meta"><span className="testimonial-name">{t.name}</span><span className="testimonial-rank">{t.rank}</span></div>
            </div>
          ))}
        </div>
        <p className="testimonials-hook">Reach Einherjar (12 referrals) and earn your place on the Founders Wall.</p>
      </Reveal>

      {/* IGDRASIL: Norse World Tree */}
      <Reveal className="community">
        <div className="community-inner">
          <h2 className="community-headline">Climb The Igdrasil. <em>It's kind of our thing.</em></h2>
          <p className="community-text">8 ranks. Refer friends. Unlock access. Not the reason to join, but a fun reason to stay.</p>

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
                const isReached = originalIndex <= 5 // demo: Jarl (index 5) is current
                const isActive = originalIndex === 5
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

          <button className="community-cta" onClick={() => setShowSignup(true)}>Join the Movement</button>
          <p className="community-proof">{WAITLIST_COUNT} people. {300 - WAITLIST_COUNT} spots left.</p>
        </div>
      </Reveal>

      {/* FOOTER */}
      <footer className="site-footer">
        <RavenIcon className="footer-raven" size={24} />
        <img src={logo} alt="Gebauer" className="footer-logo" />
        <p className="footer-tagline">Founded by a teen. Crafted in Japan. Built to age with you.</p>
        <p className="footer-copy">&copy; {new Date().getFullYear()} Gebauer Watches</p>
      </footer>

      {/* SIGNUP MODAL */}
      {showSignup && (
        <div className="signup-overlay overlay-enter">
          <div className="signup-backdrop" onClick={() => setShowSignup(false)} />
          <div className="signup-card card-enter">
            <button className="signup-close" onClick={() => setShowSignup(false)} aria-label="Close">&times;</button>
            <h2>Join The First 300</h2>
            <p className="signup-sub">You found this before everyone else.</p>
            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="honeypot" aria-hidden="true"><input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" /></div>
              <div><label htmlFor="firstName">Full Name</label><input id="firstName" type="text" placeholder="Your name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={100} /></div>
              <div><label htmlFor="email">Email</label><input id="email" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} /></div>
              {error && <p className="signup-error">{error}</p>}
              <button type="submit" className="signup-submit" disabled={loading}>{loading ? 'Joining...' : 'Join the Movement'}</button>
            </form>
            <p className="signup-count">{WAITLIST_COUNT} people are already in.</p>
          </div>
        </div>
      )}
    </>
  )
}

export default App
