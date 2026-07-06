type PrepUpLogoProps = {
  size?: number
  className?: string
  variant?: 'mark' | 'full'
  /** Light text for dark headers */
  onDark?: boolean
}

/** Ascending bars + up arrow — placement intelligence mark */
export default function PrepUpLogo({
  size = 32,
  className = '',
  variant = 'mark',
  onDark = false,
}: PrepUpLogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="prepup-grad" x1="8" y1="56" x2="56" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E56C0" />
          <stop offset="0.55" stopColor="#0D9488" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#prepup-grad)" />
      <rect x="14" y="38" width="8" height="14" rx="2" fill="white" opacity="0.45" />
      <rect x="26" y="30" width="8" height="22" rx="2" fill="white" opacity="0.65" />
      <rect x="38" y="20" width="8" height="32" rx="2" fill="white" opacity="0.9" />
      <path
        d="M46 30 L46 14 M46 14 L42 18 M46 14 L50 18"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )

  if (variant === 'mark') return mark

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {mark}
      <div className="min-w-0 text-left">
        <p
          className="font-display font-bold leading-none truncate"
          style={{ fontSize: size * 0.44, color: onDark ? '#fff' : 'var(--text)' }}
        >
          PrepUp
        </p>
        <p
          className="font-medium truncate mt-0.5"
          style={{
            fontSize: size * 0.28,
            color: onDark ? 'rgba(255,255,255,0.75)' : 'var(--text-2)',
          }}
        >
          Placement intelligence
        </p>
      </div>
    </div>
  )
}
