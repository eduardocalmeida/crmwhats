'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { CreateCrmLeadDTO, CrmLead, CrmPipeline } from '@/types'
import { cn } from '@/lib/utils'
import { formatBRL, summarizeLeads } from '@/lib/crm/crm-utils'
import { CrmLeadCard } from './CrmLeadCard'

interface CrmKanbanBoardProps {
  pipeline: CrmPipeline
  leadsByStage: Record<string, CrmLead[]>
  onMoveLead: (leadId: string, stageId: string, index: number) => void
  onOpenLead: (leadId: string) => void
  onQuickAdd: (dto: CreateCrmLeadDTO) => Promise<unknown>
}

type DropTarget = { stageId: string; index: number } | null

/**
 * Kanban do funil (visão principal do Kommo).
 * Drag & drop nativo HTML5; etapas Ganho/Perdido aparecem como colunas finais.
 */
export function CrmKanbanBoard({ pipeline, leadsByStage, onMoveLead, onOpenLead, onQuickAdd }: CrmKanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)
  const [quickAddStage, setQuickAddStage] = useState<string | null>(null)

  const handleDrop = (stageId: string, index: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const leadId = e.dataTransfer.getData('text/plain') || draggingId
    setDropTarget(null)
    setDraggingId(null)
    if (leadId) onMoveLead(leadId, stageId, index)
  }

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto pb-2" role="list" aria-label={`Etapas do funil ${pipeline.name}`}>
      {pipeline.stages.map((stage) => {
        const leads = leadsByStage[stage.id] ?? []
        const { count, total } = summarizeLeads(leads)
        const isTarget = dropTarget?.stageId === stage.id
        const isTerminal = stage.type !== 'open'

        return (
          <section
            key={stage.id}
            role="listitem"
            aria-label={`${stage.name}: ${count} leads`}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-xl border bg-[var(--ds-bg-surface)]/60',
              isTarget ? 'border-primary-500/60' : 'border-[var(--ds-border-subtle)]',
              isTerminal && 'w-64'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              if (!isTarget || dropTarget?.index !== leads.length) setDropTarget({ stageId: stage.id, index: leads.length })
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null)
            }}
            onDrop={handleDrop(stage.id, leads.length)}
          >
            <header className="px-3 pt-3 pb-2">
              <div className="h-1 rounded-full mb-2" style={{ backgroundColor: stage.color }} aria-hidden="true" />
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-primary)] truncate">
                  {stage.name}
                </h3>
                {stage.type === 'open' && (
                  <button
                    type="button"
                    onClick={() => setQuickAddStage(quickAddStage === stage.id ? null : stage.id)}
                    className="rounded p-1 text-[var(--ds-text-muted)] hover:text-primary-400 hover:bg-[var(--ds-bg-hover)]"
                    aria-label={`Adição rápida em ${stage.name}`}
                    title="Adição rápida"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--ds-text-muted)]">
                {count} {count === 1 ? 'lead' : 'leads'} · {formatBRL(total)}
              </p>
            </header>

            {quickAddStage === stage.id && (
              <QuickAddForm
                onCancel={() => setQuickAddStage(null)}
                onSubmit={async (data) => {
                  await onQuickAdd({ pipelineId: pipeline.id, stageId: stage.id, ...data })
                  setQuickAddStage(null)
                }}
              />
            )}

            <div className="flex-1 min-h-[80px] space-y-2 overflow-y-auto px-2 pb-2">
              {leads.map((lead, index) => (
                <div
                  key={lead.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (dropTarget?.stageId !== stage.id || dropTarget.index !== index) setDropTarget({ stageId: stage.id, index })
                  }}
                  onDrop={handleDrop(stage.id, index)}
                >
                  {isTarget && dropTarget?.index === index && draggingId !== lead.id && (
                    <div className="mb-2 h-1 rounded bg-primary-500/70" aria-hidden="true" />
                  )}
                  <CrmLeadCard
                    lead={lead}
                    isDragging={draggingId === lead.id}
                    onClick={() => onOpenLead(lead.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', lead.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setDraggingId(lead.id)
                    }}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDropTarget(null)
                    }}
                  />
                </div>
              ))}
              {isTarget && dropTarget?.index === leads.length && (
                <div className="h-1 rounded bg-primary-500/70" aria-hidden="true" />
              )}
              {leads.length === 0 && !isTarget && (
                <p className="py-6 text-center text-xs text-[var(--ds-text-muted)]">Arraste leads para cá</p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function QuickAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { title: string; contactName?: string; contactPhone?: string; value?: number }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputCls =
    'w-full rounded-md border border-[var(--ds-border-default)] bg-[var(--ds-bg-base)] px-2 py-1.5 text-xs text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:border-primary-500'

  return (
    <form
      className="mx-2 mb-2 space-y-1.5 rounded-lg border border-primary-500/40 bg-[var(--ds-bg-elevated)] p-2"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        setSaving(true)
        try {
          await onSubmit({
            title: title.trim(),
            contactName: contactName.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            value: value ? Number(value) : undefined,
          })
        } catch {
          /* toast exibido pelo controller */
        } finally {
          setSaving(false)
        }
      }}
    >
      <input autoFocus className={inputCls} placeholder="Nome do lead *" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Nome do lead" />
      <input className={inputCls} placeholder="Nome do contato" value={contactName} onChange={(e) => setContactName(e.target.value)} aria-label="Nome do contato" />
      <input className={inputCls} placeholder="Telefone (WhatsApp)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} aria-label="Telefone" />
      <input className={inputCls} placeholder="Valor (R$)" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Valor" />
      <div className="flex justify-end gap-1.5 pt-1">
        <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-xs text-[var(--ds-text-secondary)] hover:bg-[var(--ds-bg-hover)]">
          Cancelar
        </button>
        <button type="submit" disabled={saving || !title.trim()} className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
          {saving ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
