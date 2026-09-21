export function Logo({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#1d4ed8"/>
        </linearGradient>
      </defs>
      <path d="M74.5 70.6 A 32 32 0 1 1 74.5 29.4" stroke="url(#lg)" strokeWidth="16" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export default Logo;
