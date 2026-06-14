/**
 * TechnicalDrawing — inline SVG line-art rendering of a Gebauer watch front view.
 * Replaces the Seiko wrist photo on the Milan story section per Boat Launch feedback:
 * the site should lead with what we're MAKING, not the watch Liam bought before.
 */
export default function TechnicalDrawing({ className = '', style = {} }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Technical drawing of a Gebauer watch"
    >
      <defs>
        <pattern id="gebauer-grain" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M0 4 L4 0" stroke="rgba(196,149,42,0.18)" strokeWidth="0.4" />
        </pattern>
      </defs>

      {/* Outer case */}
      <circle cx="300" cy="300" r="220" fill="none" stroke="#c4952a" strokeWidth="2" />
      <circle cx="300" cy="300" r="210" fill="none" stroke="#c4952a" strokeWidth="0.8" />

      {/* Dial */}
      <circle cx="300" cy="300" r="190" fill="url(#gebauer-grain)" stroke="#c4952a" strokeWidth="1" />

      {/* Inner ring */}
      <circle cx="300" cy="300" r="178" fill="none" stroke="rgba(196,149,42,0.5)" strokeWidth="0.5" />

      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180)
        const x1 = 300 + Math.cos(angle) * 168
        const y1 = 300 + Math.sin(angle) * 168
        const x2 = 300 + Math.cos(angle) * 184
        const y2 = 300 + Math.sin(angle) * 184
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#c4952a"
            strokeWidth={i % 3 === 0 ? 2.5 : 1.2}
          />
        )
      })}

      {/* Hour hand */}
      <line x1="300" y1="300" x2="300" y2="190" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      {/* Minute hand */}
      <line x1="300" y1="300" x2="395" y2="245" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      {/* Center dot */}
      <circle cx="300" cy="300" r="6" fill="#c4952a" />

      {/* Crown */}
      <rect x="520" y="288" width="22" height="24" fill="none" stroke="#c4952a" strokeWidth="1.5" />
      <line x1="525" y1="294" x2="540" y2="294" stroke="#c4952a" strokeWidth="0.8" />
      <line x1="525" y1="300" x2="540" y2="300" stroke="#c4952a" strokeWidth="0.8" />
      <line x1="525" y1="306" x2="540" y2="306" stroke="#c4952a" strokeWidth="0.8" />

      {/* Lugs (top + bottom) */}
      <line x1="262" y1="82" x2="262" y2="58" stroke="#c4952a" strokeWidth="1.4" />
      <line x1="338" y1="82" x2="338" y2="58" stroke="#c4952a" strokeWidth="1.4" />
      <line x1="262" y1="518" x2="262" y2="542" stroke="#c4952a" strokeWidth="1.4" />
      <line x1="338" y1="518" x2="338" y2="542" stroke="#c4952a" strokeWidth="1.4" />

      {/* Dimension lines — 39mm callout */}
      <line x1="80" y1="80" x2="80" y2="520" stroke="rgba(196,149,42,0.45)" strokeWidth="0.5" strokeDasharray="2,3" />
      <line x1="78" y1="80" x2="86" y2="80" stroke="rgba(196,149,42,0.6)" strokeWidth="0.8" />
      <line x1="78" y1="520" x2="86" y2="520" stroke="rgba(196,149,42,0.6)" strokeWidth="0.8" />
      <text x="60" y="305" fill="rgba(196,149,42,0.8)" fontSize="11" fontFamily="monospace" letterSpacing="2">39mm</text>

      {/* Center label */}
      <text x="300" y="232" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="14" fontFamily="serif" letterSpacing="6">GEBAUER</text>
      <text x="300" y="380" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace" letterSpacing="3">001 / 300</text>

      {/* Bottom caption */}
      <text x="300" y="572" textAnchor="middle" fill="rgba(196,149,42,0.7)" fontSize="10" fontFamily="monospace" letterSpacing="3">REV. 04  ·  MADE IN JAPAN</text>
    </svg>
  )
}
