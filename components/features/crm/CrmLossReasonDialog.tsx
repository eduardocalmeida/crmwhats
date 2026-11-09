'use client'

import { useState } from 'react'
import type { CrmLossReason } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { fieldCls } from './crm-form'

interface CrmLossReasonDialogProps {
  open: boolean
  reasons: CrmLossReason[]
  onConfirm: (reason: string | null) => void
  onCancel: () => void
}

/** Ao mover para "Perdido", o Kommo pede o motivo da perda. */
export function CrmLossReasonDialog({ open, reasons, onConfirm, onCancel }: CrmLossReasonDialogProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [custom, setCustom] = useState('')

  const close = () => {
    setSelected(null)
    setCustom('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (close(), onCancel())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo da perda</DialogTitle>
          <DialogDescription>Por que este lead foi perdido? Isso alimenta os relatórios do funil.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {reasons.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r.name)}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-left text-sm',
                selected === r.name
                  ? 'border-red-500/60 bg-red-500/10 text-[var(--ds-text-primary)]'
                  : 'border-[var(--ds-border-default)] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-bg-hover)]'
              )}
            >
              {r.name}
            </button>
          ))}
          <input
            className={fieldCls}
            placeholder="Outro motivo…"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value)
              setSelected(null)
            }}
            aria-label="Outro motivo"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => (close(), onCancel())}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const reason = selected ?? (custom.trim() || null)
              close()
              onConfirm(reason)
            }}
          >
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
