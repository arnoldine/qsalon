interface QuickSalonLogoProps {
  size?: number
  className?: string
}

export function QuickSalonLogo({ size = 56, className }: QuickSalonLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="52" height="52" rx="14" fill="#b2592f" />
      <path d="M17 14C21.2 15.2 24.8 19.4 27.3 24.2C29.7 29 32.6 34.4 39 40" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M39 14C34.8 15.2 31.2 19.4 28.7 24.2C26.3 29 23.4 34.4 17 40" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="15.5" cy="13.5" r="4" stroke="white" strokeWidth="2.8" fill="none" />
      <circle cx="40.5" cy="13.5" r="4" stroke="white" strokeWidth="2.8" fill="none" />
      <path d="M26 24L30 24" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  )
}
