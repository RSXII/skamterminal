// All FCOS iconography is inline SVG line-art so no image assets are needed
// and everything inherits the gold magitech palette.

export function SkamSigil({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="sigilGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd58a" />
          <stop offset="100%" stopColor="#c07f22" />
        </linearGradient>
      </defs>
      {/* serpentine S */}
      <path
        d="M40 8 C20 6 12 20 24 27 C38 35 44 38 38 47 C33 55 20 54 16 46"
        stroke="url(#sigilGold)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* four-point star */}
      <path
        d="M49 14 L51.2 19.8 L57 22 L51.2 24.2 L49 30 L46.8 24.2 L41 22 L46.8 19.8 Z"
        fill="url(#sigilGold)"
      />
    </svg>
  );
}

export function BrowserIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <circle cx="16" cy="16" r="11" />
      <ellipse cx="16" cy="16" rx="5" ry="11" />
      <path d="M5.5 13h21M5.5 19h21" />
    </svg>
  );
}

export function EstateIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M5 15 L16 6 L27 15" />
      <path d="M8 13.5 V26 h16 V13.5" />
      <path d="M13.5 26 v-7 h5 v7" />
      <path d="M19.5 10.5 v-3 h3 v5.5" />
    </svg>
  );
}

export function PeopleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <circle cx="16" cy="11" r="5" />
      <path d="M6 27 c0-6 4.5-9 10-9 s10 3 10 9" />
      <path d="M4 5 h6 M4 5 v6 M28 5 h-6 M28 5 v6" opacity="0.6" />
    </svg>
  );
}

export function SpeakerIcon({
  className = "",
  muted = false,
}: {
  className?: string;
  muted?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path d="M4 9.5 h4 L13 5.5 v13 L8 14.5 H4 Z" fill="currentColor" fillOpacity="0.25" />
      {muted ? (
        <path d="M16 9.5 l5 5 M21 9.5 l-5 5" />
      ) : (
        <>
          <path d="M16 9 c1.5 1.5 1.5 4.5 0 6" />
          <path d="M18.5 6.5 c3 3 3 8 0 11" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

/**
 * Generated NPC portrait — the gold "record silhouette" from the S.K.AM
 * database aesthetic, tinted per-NPC and stamped with initials.
 */
export function PortraitPlaceholder({
  seed,
  initials,
  className = "",
}: {
  seed: number;
  initials: string;
  className?: string;
}) {
  // subtle per-NPC hue shift around gold
  const hue = 36 + ((seed * 13) % 24) - 12;
  const stroke = `hsl(${hue} 70% 58%)`;
  const fill = `hsl(${hue} 70% 58% / 0.12)`;
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <rect x="2" y="2" width="116" height="116" fill="none" stroke={stroke} strokeOpacity="0.5" />
      <path d="M2 14 V2 H14 M106 2 H118 V14 M118 106 V118 H106 M14 118 H2 V106" stroke={stroke} strokeWidth="3" fill="none" />
      <circle cx="60" cy="46" r="19" fill={fill} stroke={stroke} strokeWidth="2" />
      <path d="M24 106 C24 82 40 72 60 72 C80 72 96 82 96 106" fill={fill} stroke={stroke} strokeWidth="2" />
      <text
        x="108"
        y="112"
        textAnchor="end"
        fontSize="13"
        fill={stroke}
        fontFamily="var(--font-tech)"
        letterSpacing="1"
      >
        {initials}
      </text>
    </svg>
  );
}

/** Generated line-art thumbnail for property listings. */
export function ListingArt({
  kind,
  className = "",
}: {
  kind: "house" | "apartment";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden>
      <rect x="1" y="1" width="198" height="118" fill="rgba(232,163,61,0.05)" stroke="#57401d" />
      {kind === "house" ? (
        <g stroke="#e8a33d" strokeWidth="1.5" fill="none">
          <path d="M45 62 L100 28 L155 62" />
          <path d="M56 56 V96 h88 V56" />
          <path d="M88 96 v-22 h24 v22" />
          <rect x="64" y="64" width="14" height="12" />
          <rect x="122" y="64" width="14" height="12" />
          <path d="M132 38 v-12 h10 v19" />
          <path d="M30 96 h140" strokeOpacity="0.5" />
        </g>
      ) : (
        <g stroke="#e8a33d" strokeWidth="1.5" fill="none">
          <rect x="70" y="20" width="60" height="76" />
          {[30, 44, 58, 72].map((y) => (
            <g key={y}>
              <rect x="78" y={y} width="10" height="8" />
              <rect x="95" y={y} width="10" height="8" />
              <rect x="112" y={y} width="10" height="8" />
            </g>
          ))}
          <path d="M92 96 v-10 h16 v10" />
          <path d="M40 96 h120" strokeOpacity="0.5" />
          <path d="M52 96 V54 h18 M148 96 V64 h-18" strokeOpacity="0.6" />
        </g>
      )}
    </svg>
  );
}
