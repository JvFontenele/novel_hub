import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmTone?: 'danger' | 'primary'
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmTone = 'primary',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={isPending ? undefined : onCancel}
      />

      <div className="card relative w-full max-w-md p-5">
        <div className="pr-8">
          <h2 className="text-base font-semibold text-parchment font-body">{title}</h2>
          {description ? (
            <div className="mt-2 text-sm text-parchment-muted font-body leading-6">{description}</div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-parchment-muted hover:bg-ink-2 hover:text-parchment disabled:opacity-40"
          aria-label="Fechar confirmação"
        >
          ×
        </button>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-ink-3 bg-ink-1 px-3 py-2 text-xs font-semibold text-parchment transition-colors hover:bg-ink-2 disabled:opacity-40 font-body"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={
              confirmTone === 'danger'
                ? 'rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/15 disabled:opacity-40 font-body'
                : 'rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-40 font-body'
            }
          >
            {isPending ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
