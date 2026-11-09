import { useId } from 'react'
import { cn } from '@/lib/utils'

export interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
  textClassName?: string
}

export function Logo({
  size = 32,
  className,
  showText = false,
  textClassName,
}: LogoProps) {
  const reactId = useId()
  const cleanId = reactId.replace(/:/g, '')
  const gradId = `finolio-grad-${cleanId}`
  const baseGradId = `finolio-base-${cleanId}`

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
        aria-hidden={showText ? 'true' : undefined}
        role={showText ? undefined : 'img'}
        aria-label={showText ? undefined : 'Finolio'}
      >
        <defs>
          <linearGradient
            id={gradId}
            x1="12"
            y1="52"
            x2="52"
            y2="12"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="55%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient
            id={baseGradId}
            x1="12"
            y1="52"
            x2="36"
            y2="44"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Ground foundation: Capital discipline & security */}
        <path
          d="M12 44C19 48 31 48 48 42"
          stroke={`url(#${baseGradId})`}
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* The Unlocked Loop: Breaking the cycle */}
        <path
          d="M16 36C13 25 21 11 41 14"
          stroke={`url(#${gradId})`}
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* The Escape Velocity: Compounding trajectory & ascending 'F' wing */}
        <path
          d="M22 38L48 12M48 12H34M48 12V26"
          stroke={`url(#${gradId})`}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Destination Sovereign Star */}
        <circle cx="48" cy="12" r="3.5" fill="#38BDF8" />
      </svg>
      {showText && (
        <span
          className={cn(
            'font-semibold text-lg tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text',
            textClassName
          )}
        >
          Finolio
        </span>
      )}
    </div>
  )
}

