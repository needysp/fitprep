/** Minimal line chart for a single series — no chart library needed. */
export function Sparkline({
  values,
  className = 'h-16 w-full',
  strokeWidth = 2,
}: {
  values: number[]
  className?: string
  strokeWidth?: number
}) {
  if (values.length < 2) return null

  const width = 640
  const height = 160
  const pad = 8
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const points = values.map((value, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = height - pad - ((value - min) / span) * (height - pad * 2)
    return `${x},${y}`
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend over time"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#d97757"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
