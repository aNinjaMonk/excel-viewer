import { useEffect, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  busyLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Modal confirmation built on <dialog>, which provides focus trapping, Escape-to-close and a backdrop. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        e.preventDefault() // keep `open` prop as the source of truth
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        // Clicks on the ::backdrop land on the dialog element itself
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div className="confirm-dialog-body">
        <div className="confirm-dialog-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </div>
        <div className="confirm-dialog-content">
          <h3 id="confirm-dialog-title">{title}</h3>
          {children}
        </div>
      </div>
      <div className="confirm-dialog-actions">
        <button type="button" autoFocus disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
