import { useState, useEffect } from 'react'
import logo from './assets/gebauer-logo.svg'
import { Reveal } from './App.jsx'
import { FALLBACK_WAITLIST_COUNT, founderAgeNow } from './founder.js'

/**
 * The full founder story, split off the homepage Nov 18 2026.
 *
 * All eight beats used to run back to back on the homepage, between the
 * specifications and the waitlist CTA. They are the best writing on the site
 * and they were also the longest thing on it: a visitor who had already
 * decided had to scroll past eight first-person sections to act, and a parent
 * shopping for a gift met the founder's childhood before the product.
 *
 * Nothing was cut. The homepage keeps three beats (the smartwatch, Milan, and
 * "no idea where to start") and links here for the rest. The arc those three
 * carry is: a gift that did not land, an object that did, and what it took to
 * make one. Everything else, including the class-ring data and its citations,
 * lives on this page in full and in order.
 */
function Story() {
  const [waitlistCount, setWaitlistCount] = useState(FALLBACK_WAITLIST_COUNT)
  const founderAge = founderAgeNow()

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { if (d.total) setWaitlistCount(d.total) })
      .catch(() => {})
  }, [])

  return (
    <div className="story-page">
      <header className="story-page-header">
        <a href="/"><img src={logo} alt="Gebauer" style={{ width: 36, opacity: 0.7 }} /></a>
      </header>

      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{ textAlign: 'center' }}>
          <p className="watches-pre-label">The whole story</p>
          <h1 className="story-beat-headline">It started with a watch I never wore.</h1>
          <p className="story-beat-text">For my 10th birthday my parents got me a smartwatch. It tracked my skiing and doubled as a safety device on the mountain. I never wore it. It sat at my charging station for three years until my dad took it for himself, and I didn&rsquo;t care then and I still don&rsquo;t. I couldn&rsquo;t have told you why at the time. Looking back, I didn&rsquo;t wear it because it was just another device.</p>
        </div>
      </Reveal>

      <Reveal className="story-beat story-milan">
        <div className="story-beat-inner story-beat-over">
          <h2 className="story-beat-headline">Four years after that birthday, I bought a watch in Milan.</h2>
          <p className="story-beat-text">I walked into a Seiko store with 310 euros I'd been saving for months, and walked out with my first real watch. What amazed me was that it didn't beep or buzz or try to get my attention. It just told the time. It was the first thing I'd ever bought that wasn't going to wear out.</p>
        </div>
      </Reveal>

      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{ textAlign: 'center' }}>
          <h2 className="story-beat-headline">Then I started getting gift cards.</h2>
          <p className="story-beat-text">I spent one on a plant that just sits in my room, another on a book I half read, and another on some pants I grew out of. My middle school graduation gift card bought a snack at the airport. They were all nice. None of them marked anything.</p>
        </div>
      </Reveal>

      {/* Cash and gift cards are shown SEPARATELY on purpose. They are shares
          of gifts, not of dollars, and respondents can pick both, so adding
          them to reach one big number would be double counting. */}
      <Reveal className="story-beat story-cream" id="problem">
        <div className="story-beat-inner">
          <h2 className="story-beat-headline">Then I realized it wasn&rsquo;t just me.</h2>
          <p className="story-beat-text">Class rings used to be the object you got. Two decades ago around 65% of high school sophomores bought one. By the 2010s it was 20 to 30%, according to a Jostens representative. I have never seen a single person at my school with one.</p>

          <div className="stats-bar-inner problem-stats">
            <div className="stats-bar-item">
              <span className="stats-bar-num">$6.8B</span>
              <span className="stats-bar-label">Spent on graduation gifts</span>
            </div>
            <div className="stats-bar-item">
              <span className="stats-bar-num">20&ndash;30%</span>
              <span className="stats-bar-label">Sophomores with a class ring, from 65%</span>
            </div>
            <div className="stats-bar-item">
              <span className="stats-bar-num">Over half</span>
              <span className="stats-bar-label">Of graduation gifts are cash</span>
            </div>
          </div>

          <p className="story-beat-text">The money never went anywhere. Graduation gift spending just hit a record. Cash is the single most popular gift and it turns up in more than half of them, with gift cards in another 31%. So the spending stayed exactly where it was. The object is the part that disappeared.</p>
          <p className="problem-cite">Spending and gift data: National Retail Federation. Class ring figures: Jostens.</p>
        </div>
      </Reveal>

      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{ textAlign: 'center' }}>
          <h2 className="story-beat-headline">Then I put it together.</h2>
          <p className="story-beat-text">A watch with a real wood dial. Something that lasts, that you can't spend, and that you'd actually want to wear. So I started designing it.</p>
        </div>
      </Reveal>

      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{ textAlign: 'center' }}>
          <h2 className="story-beat-headline">But I had no idea where to start.</h2>
          <p className="story-beat-text">I was fourteen and I didn't run a watch company. I emailed manufacturers in five countries and most of them ignored me. Then one in Japan wrote back. Then one in Italy. I'm {founderAge} now, and they are making the first 300.</p>
        </div>
      </Reveal>

      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{ textAlign: 'center' }}>
          <h2 className="story-beat-headline">I told my friends. They told their friends.</h2>
          <p className="story-beat-text">{waitlistCount} people signed up before I had a single sample to show. They started asking what I was actually making. So I asked them back.</p>
        </div>
      </Reveal>

      <Reveal className="story-beat story-dark">
        <div className="story-beat-inner" style={{ textAlign: 'center' }}>
          <h2 className="story-beat-headline">That's when it became us. Not me.</h2>
          <p className="story-beat-text">I've had one-on-one conversations with over 60 of them. Every question, every "what if you..." shaped what I built.</p>
        </div>
      </Reveal>

      <Reveal className="story-beat story-cream">
        <div className="story-beat-inner" style={{ textAlign: 'center' }}>
          <h2 className="story-beat-headline">That's the whole story.</h2>
          <p className="story-beat-text">The watch itself is back on the main page, with the woods, the specifications and how a wood dial is made.</p>
          <a href="/#watches" className="story-cta">See the watch</a>
        </div>
      </Reveal>
    </div>
  )
}

export default Story
