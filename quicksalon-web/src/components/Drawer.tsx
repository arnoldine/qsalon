interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  return (
    <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={onClose}>
      <aside className={`drawer-panel${open ? ' open' : ''}`} onClick={(e) => e.stopPropagation()} aria-hidden={!open}>
        <header className="drawer-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close drawer">Close</button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  )
}
