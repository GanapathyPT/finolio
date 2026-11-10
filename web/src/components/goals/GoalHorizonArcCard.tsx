import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react'
import { calculateProjectedCorpus } from '@/types/goals'

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

function useCountUp(targetVal: number, durationMs: number = 900) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (targetVal <= 0) return

    let startTimestamp: number | null = null
    let frameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min(1, (timestamp - startTimestamp) / durationMs)
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(easeOut * targetVal))

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [targetVal, durationMs])

  return targetVal <= 0 ? 0 : val
}

interface GoalHorizonArcCardProps {
  directInvested: number
  directPnL: number
  directPnLPct: number
  effectiveCovered: number
  target?: number | null
  targetGap?: number | null
  targetDate?: string | null
}

export function GoalHorizonArcCard({
  directInvested,
  directPnL,
  directPnLPct,
  effectiveCovered,
  target,
  targetGap: _targetGap,
  targetDate,
}: GoalHorizonArcCardProps) {
  const isTargetSet = Boolean(target && target > 0)
  const isProfit = directPnL >= 0

  // Inflation projection (fixed 7% p.a.)
  const inflationData = calculateProjectedCorpus(target, targetDate, 0.07)
  const [showProjected, setShowProjected] = useState(true)

  // Determine active benchmark target: projected corpus if enabled and has inflation, else nominal target
  const activeTarget =
    isTargetSet && inflationData.hasInflation && showProjected
      ? inflationData.projectedAmount
      : (target ?? 0)

  const activeTargetGap = isTargetSet
    ? Math.max(0, activeTarget - effectiveCovered)
    : null

  // Animated live number count-up
  const animatedCovered = useCountUp(effectiveCovered, 900)

  // Percentages & Arc Geometry
  // Arc parameters: 180° semi-circle from (28, 122) over (120, 30) to (212, 122)
  const cx = 120
  const cy = 122
  const r = 92
  const totalArcLen = Math.PI * r // ~289.03

  let principalPct = 0
  let pnlPct = 0
  let coveredPct = 0
  let multiplier = 1

  if (isTargetSet && activeTarget > 0) {
    principalPct = Math.max(0, (directInvested / activeTarget) * 100)
    pnlPct = (directPnL / activeTarget) * 100
    coveredPct = Math.min(100, Math.max(0, (effectiveCovered / activeTarget) * 100))
  } else {
    // Open-ended goal: represents anatomy of accumulated wealth
    if (effectiveCovered > 0) {
      if (isProfit) {
        principalPct = Math.max(0, (directInvested / effectiveCovered) * 100)
        pnlPct = (directPnL / effectiveCovered) * 100
      } else {
        principalPct = directInvested > 0 ? (effectiveCovered / directInvested) * 100 : 0
        pnlPct = directInvested > 0 ? (directPnL / directInvested) * 100 : 0
      }
      coveredPct = 100
    }
    multiplier = directInvested > 0 ? effectiveCovered / directInvested : 1
  }

  // Arc stroke lengths (clamped for visual display)
  const principalLen = Math.min(
    totalArcLen,
    isProfit
      ? (principalPct / 100) * totalArcLen
      : (coveredPct / 100) * totalArcLen
  )
  const pnlDisplayPct = Math.abs(pnlPct)
  const pnlLen = Math.min(
    Math.max(0, totalArcLen - principalLen),
    (pnlDisplayPct / 100) * totalArcLen
  )

  // Orbital Beacon coordinates at tip of progress (for targeted semi-arc)
  const beaconFraction = Math.min(1, Math.max(0, coveredPct / 100))
  // Angle goes from PI (left, 0%) down to 0 (right, 100%)
  const beaconAngle = Math.PI * (1 - beaconFraction)
  const bx = cx + r * Math.cos(beaconAngle)
  const by = cy - r * Math.sin(beaconAngle)

  // 360° Open-Ended Compounding Flywheel Geometry (Deterministic to actual pool metrics)
  const flywheelRadius = 82
  const flywheelCirc = 2 * Math.PI * flywheelRadius // ~515.22
  const poolTotal = effectiveCovered > 0 ? effectiveCovered : 1
  const openPrincipalRatio = Math.max(0, Math.min(1, directInvested / poolTotal))
  const openPnLRatio = Math.max(0, Math.min(1, Math.abs(directPnL) / poolTotal))

  let flywheelPnLLen = 0
  let flywheelPrincipalLen = flywheelCirc

  if (effectiveCovered > 0 && Math.abs(directPnL) > 0) {
    // Proportional length reflecting true P&L percentage, with a minimum visible 6px spark
    flywheelPnLLen = Math.min(
      flywheelCirc - 20,
      Math.max(6, openPnLRatio * flywheelCirc)
    )
    flywheelPrincipalLen = Math.max(20, flywheelCirc - flywheelPnLLen - 6)
  }

  // Frontier beacon position at transition between base capital and growth
  // 0 is 12 o'clock (-PI / 2), progressing clockwise
  const frontierAngle = -Math.PI / 2 + openPrincipalRatio * (2 * Math.PI)
  const fbx = 110 + flywheelRadius * Math.cos(frontierAngle)
  const fby = 110 + flywheelRadius * Math.sin(frontierAngle)

  const isAchieved = isTargetSet && coveredPct >= 100

  return (
    <div className="p-4 sm:p-6 bg-card rounded-2xl border border-border shadow-xs space-y-6">
      {/* Upper Deck: Orbital Horizon Arc / Compounding Flywheel & Core Metric Display */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {isTargetSet ? (
          /* Target Horizon Arc Gauge (Semi-radial 180° gauge toward target) */
          <div className="relative w-72 sm:w-80 h-48 sm:h-52 flex items-end justify-center select-none shrink-0 overflow-visible">
            <svg
              viewBox="0 0 240 145"
              className="w-full h-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                {/* Principal Glow Gradient */}
                <linearGradient id="principal-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>

                {/* Profit Emerald Gradient */}
                <linearGradient id="profit-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#a3e635" />
                </linearGradient>

                {/* Drawdown Rose Gradient */}
                <linearGradient id="loss-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>

                {/* Shimmer laser beam glow filter */}
                <filter id="arc-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Base Background Track (Muted Horizon Line) */}
              <path
                d="M 28 122 A 92 92 0 0 1 212 122"
                fill="none"
                stroke="currentColor"
                strokeWidth="11"
                strokeLinecap="round"
                className="text-muted/60 dark:text-muted/40"
              />

              {/* Principal Arc (Capital Invested) */}
              {principalLen > 0 && (
                <path
                  d="M 28 122 A 92 92 0 0 1 212 122"
                  fill="none"
                  stroke="url(#principal-grad)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={`${principalLen} ${totalArcLen}`}
                  strokeDashoffset="0"
                  className="transition-all duration-1000 ease-out"
                />
              )}

              {/* P&L Arc (Market Gain or Drawdown) */}
              {pnlLen > 0 && (
                <path
                  d="M 28 122 A 92 92 0 0 1 212 122"
                  fill="none"
                  stroke={isProfit ? 'url(#profit-grad)' : 'url(#loss-grad)'}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={`${pnlLen} ${totalArcLen}`}
                  strokeDashoffset={-principalLen}
                  filter={isProfit ? 'url(#arc-glow)' : undefined}
                  className="transition-all duration-1000 ease-out"
                />
              )}

              {/* Orbital Beacon: Animated Frontier Node */}
              {coveredPct > 0 && (
                <g className="transition-all duration-1000 ease-out">
                  {/* Outer Radar Ping Ripple */}
                  <circle
                    cx={bx}
                    cy={by}
                    r="13"
                    fill="none"
                    strokeWidth="2"
                    className={`animate-beacon-ping ${
                      isProfit ? 'stroke-emerald-400' : 'stroke-rose-400'
                    }`}
                  />

                  {/* Soft Halo Aura */}
                  <circle
                    cx={bx}
                    cy={by}
                    r="8"
                    className={`animate-pulse ${
                      isProfit ? 'fill-emerald-400/40' : 'fill-rose-400/40'
                    }`}
                  />

                  {/* Solid Core Beacon Pearl */}
                  <circle
                    cx={bx}
                    cy={by}
                    r="4.5"
                    className={`stroke-2 stroke-card shadow-lg ${
                      isProfit ? 'fill-emerald-400' : 'fill-rose-400'
                    }`}
                  />
                </g>
              )}

              {/* Baseline Ticks */}
              <text
                x="28"
                y="138"
                textAnchor="middle"
                className="text-[9px] font-mono font-medium fill-muted-foreground select-none"
              >
                0%
              </text>
              <text
                x="212"
                y="138"
                textAnchor="middle"
                className="text-[9px] font-mono font-medium fill-muted-foreground select-none"
              >
                100%
              </text>
            </svg>

            {/* Center Readout (Inside Arc Chamber) */}
            <div className="absolute inset-x-0 bottom-4 flex flex-col items-center text-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-foreground drop-shadow-xs">
                {formatINR(animatedCovered)}
              </span>
              <span className="text-[11px] sm:text-xs font-mono text-muted-foreground font-medium">
                {coveredPct.toFixed(1)}% of {formatINR(activeTarget)}{' '}
                {showProjected && inflationData.hasInflation ? 'proj. aim' : 'aim'}
              </span>
            </div>
          </div>
        ) : (
          /* Open-Ended Compounding Celestial Flywheel (360° perpetual orbit strictly proportional) */
          <div className="relative w-56 sm:w-64 h-56 sm:h-64 flex items-center justify-center select-none shrink-0 overflow-visible">
            <svg
              viewBox="0 0 220 220"
              className="w-full h-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="principal-grad-360" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>

                <linearGradient id="profit-grad-360" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>

                <linearGradient id="loss-grad-360" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e11d48" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>

                <radialGradient id="flywheel-center-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={isProfit ? '#10b981' : '#e11d48'} stopOpacity="0.1" />
                  <stop offset="65%" stopColor="#0284c7" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>

                <filter id="flywheel-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Central Ambient Aura */}
              <circle cx="110" cy="110" r="100" fill="url(#flywheel-center-glow)" />

              {/* Outer Orbit Guide Track (Continuous 360° Background) */}
              <circle
                cx="110"
                cy="110"
                r={flywheelRadius}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted/20"
                strokeDasharray="4 6"
              />

              {/* Rotating Composite Planetary Ring (Both Base Capital & Profit on same deterministic track) */}
              <g className="animate-flywheel-spin">
                {/* Base Capital Track (Sky Blue) - Strictly proportional */}
                <circle
                  cx="110"
                  cy="110"
                  r={flywheelRadius}
                  fill="none"
                  stroke="url(#principal-grad-360)"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeDasharray={`${flywheelPrincipalLen} ${flywheelCirc}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 110 110)"
                />

                {/* Compounded Growth Track (Emerald / Rose) - Strictly proportional */}
                {flywheelPnLLen > 0 && (
                  <circle
                    cx="110"
                    cy="110"
                    r={flywheelRadius}
                    fill="none"
                    stroke={isProfit ? 'url(#profit-grad-360)' : 'url(#loss-grad-360)'}
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeDasharray={`${flywheelPnLLen} ${flywheelCirc}`}
                    strokeDashoffset={-(flywheelPrincipalLen + 6)}
                    transform="rotate(-90 110 110)"
                    filter="url(#flywheel-glow)"
                  />
                )}

                {/* Frontier Orbit Node (Pulsing Beacon Pearl at the active growth boundary) */}
                <g>
                  <circle
                    cx={fbx}
                    cy={fby}
                    r="11"
                    fill="none"
                    stroke={isProfit ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.5"
                    className="animate-beacon-ping"
                  />
                  <circle
                    cx={fbx}
                    cy={fby}
                    r="6.5"
                    className={isProfit ? 'fill-emerald-400/40' : 'fill-rose-400/40'}
                  />
                  <circle
                    cx={fbx}
                    cy={fby}
                    r="4"
                    className={`stroke-2 stroke-card shadow-md ${
                      isProfit ? 'fill-emerald-400' : 'fill-rose-400'
                    }`}
                  />
                </g>
              </g>

              {/* Inner Cosmic Depth Ring */}
              <circle
                cx="110"
                cy="110"
                r="62"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted/15"
                strokeDasharray="2 4"
              />
            </svg>

            {/* Core Center Readout (No 'PERPETUAL ENGINE' text) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
              <span className="text-xl sm:text-2xl font-mono font-black tracking-tight text-foreground drop-shadow-xs">
                {formatINR(animatedCovered)}
              </span>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{multiplier.toFixed(2)}x Multiplier</span>
              </div>
            </div>
          </div>
        )}

        {/* Narrative & Milestone Status Engine */}
        <div className="flex-1 space-y-3.5 text-center lg:text-left min-w-0">
          <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              {isTargetSet ? 'Target Goal Progress' : 'Open-Ended Compounding Pool'}
            </span>

            {isTargetSet && inflationData.hasInflation && (
              <div className="inline-flex items-center p-0.5 rounded-md bg-muted/80 border border-border/60 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setShowProjected(true)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    showProjected
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Projected (7% p.a.)
                </button>
                <button
                  type="button"
                  onClick={() => setShowProjected(false)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    !showProjected
                      ? 'bg-background text-foreground font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Today's Cost
                </button>
              </div>
            )}

            {isTargetSet && (
              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1.5 ${
                  isAchieved
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                {isAchieved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Target className="w-3.5 h-3.5" />}
                {isAchieved ? 'Target Achieved' : `${coveredPct.toFixed(1)}% Covered`}
              </span>
            )}

            {!isTargetSet && (
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {multiplier.toFixed(2)}x Wealth Multiplier
              </span>
            )}

            {isProfit && directPnLPct >= 25 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Compounding Flywheel
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground font-mono leading-relaxed max-w-xl">
            {isTargetSet ? (
              activeTargetGap != null && activeTargetGap === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Congratulations! This goal corpus is fully covered and thriving.
                </span>
              ) : (
                <>
                  <span className="text-foreground font-semibold">{formatINR(activeTargetGap ?? 0)}</span> remaining
                  to complete your <span className="text-foreground font-semibold">{formatINR(activeTarget)}</span>{' '}
                  {showProjected && inflationData.hasInflation ? (
                    <>
                      projected aim{' '}
                      <span className="text-amber-600 dark:text-amber-400 font-normal">
                        (~{inflationData.yearsRemaining}y horizon)
                      </span>
                    </>
                  ) : (
                    'target aim'
                  )}.
                </>
              )
            ) : (
              <>
                Every <span className="text-foreground font-semibold">₹100</span> invested has multiplied into{' '}
                <span className="text-foreground font-semibold">₹{(multiplier * 100).toFixed(0)}</span> in total wealth.
                {multiplier >= 1.5 && ' Compounding is providing substantial acceleration.'}
              </>
            )}
          </p>

          {/* Quick Ratio Pills */}
          <div className="flex items-center justify-center lg:justify-start gap-2 pt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
              {isTargetSet
                ? `${principalPct.toFixed(1)}% Capital Invested`
                : `${principalPct.toFixed(1)}% Base Capital`}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg border font-semibold ${
                isProfit
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isProfit ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              {isProfit ? '+' : ''}
              {pnlPct.toFixed(1)}% {isTargetSet ? 'Accumulated P&L' : 'Compounded Growth'}
            </span>
          </div>
        </div>
      </div>

      {/* Lower Deck: Component Breakdown Swatches */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
        {/* Swatch 1: Invested Capital */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 shadow-xs" />
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Invested Capital</span>
          </div>
          <div className="font-mono font-bold text-base text-foreground">
            {formatINR(directInvested)}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {isTargetSet
              ? `${principalPct.toFixed(1)}% of goal aim`
              : `${principalPct.toFixed(1)}% of wealth pool`}
          </div>
        </div>

        {/* Swatch 2: Accumulated P&L */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ${
                isProfit ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            {isProfit ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span>Accumulated P&L</span>
          </div>
          <div
            className={`font-mono font-bold text-base ${
              isProfit
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {directPnL >= 0 ? '+' : ''}
            {formatINR(directPnL)}
          </div>
          <div
            className={`text-[10px] font-mono flex items-center gap-1 ${
              isProfit
                ? 'text-emerald-600/80 dark:text-emerald-400/80'
                : 'text-rose-600/80 dark:text-rose-400/80'
            }`}
          >
            <span>
              {isProfit ? '+' : ''}
              {directPnLPct.toFixed(1)}% on invested capital
            </span>
          </div>
        </div>

        {/* Swatch 3: Target Aim or Compounding Multiplier */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
              {isTargetSet ? (
                <Target className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>{isTargetSet ? 'Goal Target (Aim)' : 'Compounding Engine'}</span>
            </div>
            {isTargetSet && inflationData.hasInflation && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                7% infl.
              </span>
            )}
          </div>
          <div className="font-mono font-bold text-base text-foreground">
            {isTargetSet ? formatINR(activeTarget) : `${multiplier.toFixed(2)}x Multiplier`}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {isTargetSet ? (
              inflationData.hasInflation ? (
                showProjected ? (
                  <span>
                    Today's cost basis: <span className="text-foreground font-medium">{formatINR(target!)}</span> (+{formatINR(inflationData.inflationImpact)})
                  </span>
                ) : (
                  <span>
                    Projected in {inflationData.yearsRemaining}y: <span className="text-foreground font-medium">{formatINR(inflationData.projectedAmount)}</span>
                  </span>
                )
              ) : activeTargetGap != null && activeTargetGap === 0 ? (
                'Target 100% full'
              ) : (
                `${formatINR(activeTargetGap ?? 0)} remaining`
              )
            ) : (
              `₹1 gives ₹${(multiplier - 1).toFixed(2)} in profit`
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
