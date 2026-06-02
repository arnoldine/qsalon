export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="state-block">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="state-block">
      <p>{message}</p>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state-block error-block">
      <p>{message}</p>
    </div>
  )
}
