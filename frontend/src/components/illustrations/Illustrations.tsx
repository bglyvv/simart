/**
 * Small, hand-authored flat-illustration SVGs standing in for the designer's
 * own commissioned artwork in SIMART_UI_UX_Implementation_Guide.pdf (a kid
 * with a clipboard on Habits, two kids chatting on Social, a trophy on
 * Leagues, ice-cream/books/controller/park art on reward tiles). Kept as
 * plain inline SVG — no external asset pipeline, no network dependency —
 * deliberately simple/flat/rounded to match the PDF's own "restrained
 * illustrations" design-system note (page 2), not meant to be literal
 * reproductions of the mockup's AI-generated renders.
 */

export function KidWithClipboard({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 30l6 6M24 36l6-6" stroke="#F5A742" strokeWidth="3" strokeLinecap="round" />
      <path d="M176 24l7 7M176 31l7-7" stroke="#F5A742" strokeWidth="3" strokeLinecap="round" />
      <path d="M158 100l5 5M158 105l5-5" stroke="#F5A742" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="100" cy="150" rx="46" ry="8" fill="#6D35ED" opacity="0.08" />
      {/* body / hoodie */}
      <path d="M62 150v-34c0-21 17-38 38-38s38 17 38 38v34" fill="#8B5CF6" />
      <path d="M62 150v-34c0-21 17-38 38-38s38 17 38 38v34" stroke="#6D35ED" strokeWidth="2" />
      {/* raised arm */}
      <path d="M134 98c10-6 20-16 22-28" stroke="#8B5CF6" strokeWidth="14" strokeLinecap="round" />
      <circle cx="158" cy="66" r="9" fill="#F4C2A1" />
      {/* other arm holding clipboard */}
      <path d="M68 108c-8 4-14 12-15 22" stroke="#8B5CF6" strokeWidth="14" strokeLinecap="round" />
      {/* head */}
      <circle cx="100" cy="58" r="26" fill="#F4C2A1" />
      <path d="M76 52c0-16 11-28 24-28s24 12 24 28c-6-6-14-9-24-9s-18 3-24 9z" fill="#2D2A4A" />
      {/* face */}
      <circle cx="91" cy="58" r="2.6" fill="#2D2A4A" />
      <circle cx="109" cy="58" r="2.6" fill="#2D2A4A" />
      <path d="M93 67c3 3 11 3 14 0" stroke="#2D2A4A" strokeWidth="2.2" strokeLinecap="round" />
      {/* clipboard */}
      <rect x="28" y="96" width="38" height="46" rx="6" fill="#ffffff" stroke="#E1DBF7" strokeWidth="2" />
      <rect x="40" y="92" width="14" height="8" rx="3" fill="#C9BBF5" />
      <path d="M35 109l4 4 7-7" stroke="#0A7F55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 123l4 4 7-7" stroke="#0A7F55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 135l4 4 7-7" stroke="#F5A742" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TwoKidsChat({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 24l6 6M18 30l6-6" stroke="#F5A742" strokeWidth="3" strokeLinecap="round" />
      <path d="M176 20l7 7M176 27l7-7" stroke="#F5A742" strokeWidth="3" strokeLinecap="round" />
      {/* kid 1 */}
      <path d="M38 142v-28c0-16 13-29 29-29s29 13 29 29v28" fill="#8B5CF6" />
      <path d="M58 92c6-4 10-9 10-18" stroke="#8B5CF6" strokeWidth="11" strokeLinecap="round" />
      <circle cx="68" cy="68" r="6.5" fill="#F4C2A1" />
      <circle cx="67" cy="54" r="21" fill="#F4C2A1" />
      <path d="M46 52c0-13 9-23 21-23s21 10 21 23c-5-5-13-7-21-7s-16 2-21 7z" fill="#3A2E6E" />
      <circle cx="60" cy="56" r="2.2" fill="#2D2A4A" />
      <circle cx="74" cy="56" r="2.2" fill="#2D2A4A" />
      <path d="M61 64c2.4 2.2 8 2.2 10.4 0" stroke="#2D2A4A" strokeWidth="2" strokeLinecap="round" />
      {/* kid 2 */}
      <path d="M100 142v-26c0-15 12-27 27-27s27 12 27 27v26" fill="#F5A742" />
      <path d="M78 134c-2-8 0-16 6-21" stroke="#F5A742" strokeWidth="10" strokeLinecap="round" />
      <rect x="50" y="104" width="24" height="34" rx="6" fill="#ffffff" stroke="#E1DBF7" strokeWidth="2" transform="rotate(-8 62 121)" />
      <circle cx="127" cy="56" r="20" fill="#F7D4B8" />
      <path d="M107 54c0-12 9-21 20-21s20 9 20 21c-5-4-12-6-20-6s-15 2-20 6z" fill="#B4472C" />
      <circle cx="120" cy="58" r="2.2" fill="#2D2A4A" />
      <circle cx="134" cy="58" r="2.2" fill="#2D2A4A" />
      <path d="M120 66c2.6 2 7.8 2 10.4 0" stroke="#2D2A4A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TrophyCup({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 170" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trophyGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCD98A" />
          <stop offset="1" stopColor="#F5A742" />
        </linearGradient>
      </defs>
      <path d="M30 20c-16 2-24 14-20 28 4 13 16 20 28 20" stroke="#F5A742" strokeWidth="6" strokeLinecap="round" />
      <path d="M130 20c16 2 24 14 20 28-4 13-16 20-28 20" stroke="#F5A742" strokeWidth="6" strokeLinecap="round" />
      <path d="M46 16h68l-6 50c-4 24-23 38-28 38s-24-14-28-38z" fill="url(#trophyGold)" />
      <rect x="70" y="98" width="20" height="24" fill="#F5A742" />
      <path d="M50 134h60l6 16H44z" fill="#FCD98A" />
      <rect x="40" y="150" width="80" height="12" rx="4" fill="#F5A742" />
      <circle cx="80" cy="44" r="9" fill="#ffffff" opacity="0.55" />
      <path d="M18 60l5 5M18 65l5-5" stroke="#F5A742" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M140 54l6 6M140 60l6-6" stroke="#F5A742" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IceCreamArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="42" r="26" fill="#F7A8C4" />
      <circle cx="46" cy="30" r="5" fill="#ffffff" />
      <circle cx="60" cy="24" r="4" fill="#ffffff" />
      <circle cx="40" cy="44" r="3.5" fill="#ffffff" />
      <path d="M38 52l22 54 22-54z" fill="#E8C79A" />
      <path d="M40 58h40M42 68h36M45 78h30" stroke="#C99B5F" strokeWidth="2" />
      <path d="M94 26l5 5M94 31l5-5" stroke="#F5A742" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function BooksArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="70" width="76" height="16" rx="3" fill="#2E5FD9" />
      <rect x="28" y="52" width="64" height="16" rx="3" fill="#E24C4C" />
      <rect x="34" y="34" width="52" height="16" rx="3" fill="#F5A742" />
      <rect x="22" y="70" width="76" height="4" fill="#1D3F9C" />
      <rect x="28" y="52" width="64" height="4" fill="#A5342F" />
      <rect x="34" y="34" width="52" height="4" fill="#B97A1E" />
      <path d="M96 24l5 5M96 29l5-5" stroke="#F5A742" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ControllerArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M30 46c0-8 7-14 15-14h30c8 0 15 6 15 14l6 28c2 9-5 17-13 15-4-1-7-4-9-8l-3-6H49l-3 6c-2 4-5 7-9 8-8 2-15-6-13-15z"
        fill="#ffffff"
        stroke="#E1DBF7"
        strokeWidth="2"
      />
      <circle cx="42" cy="52" r="3" fill="#6D35ED" />
      <circle cx="42" cy="62" r="3" fill="#6D35ED" />
      <path d="M37 57h10" stroke="#6D35ED" strokeWidth="3" strokeLinecap="round" />
      <path d="M42 52v10" stroke="#6D35ED" strokeWidth="3" strokeLinecap="round" />
      <circle cx="78" cy="50" r="3.5" fill="#F5A742" />
      <circle cx="86" cy="58" r="3.5" fill="#0A7F55" />
      <path d="M96 24l5 5M96 29l5-5" stroke="#F5A742" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ParkArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="88" width="100" height="10" rx="3" fill="#8FBF72" />
      <circle cx="30" cy="48" r="20" fill="#6FAE55" />
      <rect x="27" y="62" width="6" height="24" fill="#8A6239" />
      <circle cx="88" cy="40" r="16" fill="#8FBF72" />
      <rect x="85" y="52" width="6" height="30" fill="#8A6239" />
      <rect x="48" y="70" width="36" height="6" rx="2" fill="#C99B5F" />
      <rect x="50" y="76" width="4" height="12" fill="#8A6239" />
      <rect x="78" y="76" width="4" height="12" fill="#8A6239" />
      <path d="M100 20l5 5M100 25l5-5" stroke="#F5A742" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
