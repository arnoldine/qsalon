export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-line short" />
      <div className="skeleton-line long" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="skeleton-row" aria-hidden="true">
      <div className="skeleton-line medium" />
      <div className="skeleton-line short" />
      <div className="skeleton-line medium" />
      <div className="skeleton-line short" />
      <div className="skeleton-line short" />
    </div>
  )
}
