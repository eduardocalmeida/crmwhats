'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { CrmPipeline, UpsertCrmStageDTO } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { STAGE_COLORS } from '@/lib/crm/crm-utils'
import { Field, fieldCls } from './crm-form'

interface CrmPipelineSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipeline: CrmPipeline
  canDelete: boolean
  onSave: (vars: { pipelineId: string; name: string; stages: UpsertCrmStageDTO[] }) => void
  onDelete: (id: string) => void
  isSaving: boolean
}

/** Configuração do funil: renomear, adicionar/remover/reordenar etapas e cores. */
export function CrmPipelineSettingsDialog({ open, onOpenChange, pipeline, canDelete, onSave, onDelete, isSaving }: CrmPipelineSettingsDialogProps) {
  const [name, setName] = useState(pipeline.name)
  const [stages, setStages] = useState<UpsertCrmStageDTO[]>([])

  useEffect(() => {
    if (open) {
      setName(pipeline.name)
      setStages(pipeline.stages.map((s) => ({ id: s.id, name: s.name, color: s.color, type: s.type })))
    }
  }, [open, pipeline])

  const openStages = stages.filter((s) => s.type === 'open')
  const terminal = stages.filter((s) => s.type !== 'open')

  const updateOpen = (index: number, patch: Partial<UpsertCrmStageDTO>) => {
    const next = openStages.map((s, i) => (i === index ? { ...s, ...patch } : s))
    setStages([...next, ...terminal])
  }
  const moveOpen = (index: number, delta: number) => {
    const next = [...openStages]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setStages([...next, ...terminal])
  }
  const removeOpen = (index: number) => setStages([...openStages.filter((_, i) => i !== index), ...terminal])
  const addOpen = () =>
    setStages([...openStages, { name: 'Nova etapa', color: STAGE_COLORS[openStages.length % STAGE_COLORS.length], type: 'open' }, ...terminal])
  const updateTerminal = (index: number, patch: Partial<UpsertCrmStageDTO>) =>
    setStages([...openStages, ...terminal.map((s, i) => (i === index ? { ...s, ...patch } : s))])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar funil</DialogTitle>
          <DialogDescription>Etapas abertas aparecem na ordem abaixo. Ganho e Perdido ficam sempre no final.</DialogDescription>
        </DialogHeader>

        <Field label="Nome do funil">
          <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--ds-text-secondary)]">Etapas</p>
          {openStages.map((stage, i) => (
            <div key={stage.id ?? `new-${i}`} className="flex items-center gap-2">
              <input
                type="color"
                value={stage.color}
                onChange={(e) => updateOpen(i, { color: e.target.value })}
                className="h-9 w-9 shrink-0 cursor-pointer rounded border border-[var(--ds-border-default)] bg-transparent"
                aria-label={`Cor da etapa ${stage.name}`}
              />
              <input className={fieldCls} value={stage.name} onChange={(e) => updateOpen(i, { name: e.target.value })} aria-label="Nome da etapa" />
              <Button variant="ghost" size="icon-sm" onClick={() => moveOpen(i, -1)} disabled={i === 0} aria-label="Mover para cima">
                <ArrowUp size={14} />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => moveOpen(i, 1)} disabled={i === openStages.length - 1} aria-label="Mover para baixo">
                <ArrowDown size={14} />
              </Button>
              <Button variant="ghost-destructive" size="icon-sm" onClick={() => removeOpen(i)} disabled={openStages.length <= 1} aria-label="Remover etapa">
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOpen}>
            <Plus size={14} /> Adicionar etapa
          </Button>

          <div className="pt-2 space-y-2 border-t border-[var(--ds-border-subtle)]">
            {terminal.map((stage, i) => (
              <div key={stage.id ?? stage.type} className="flex items-center gap-2">
                <span className="h-9 w-9 shrink-0 rounded border border-[var(--ds-border-default)]" style={{ backgroundColor: stage.color }} aria-hidden="true" />
                <input className={fieldCls} value={stage.name} onChange={(e) => updateTerminal(i, { name: e.target.value })} aria-label="Nome da etapa final" />
                <span className="w-20 shrink-0 text-xs text-[var(--ds-text-muted)]">{stage.type === 'won' ? 'Ganho' : 'Perdido'}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {canDelete ? (
            <Button
              variant="ghost-destructive"
              onClick={() => {
                if (window.confirm(`Excluir o funil "${pipeline.name}" e todos os seus leads?`)) onDelete(pipeline.id)
              }}
            >
              Excluir funil
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              disabled={isSaving || !name.trim() || stages.some((s) => !s.name.trim())}
              onClick={() => onSave({ pipelineId: pipeline.id, name: name.trim(), stages })}
            >
              {isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
