'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  PlusCircle,
  RotateCcw,
  StickyNote,
  Trash2,
} from 'lucide-react'
import type { CrmLead, CrmLeadEvent, CrmLossReason, CrmPipeline, CrmServiceType, CrmTask, CrmTaskType } from '@/types'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useCrmLeadDetail } from '@/hooks/useCrm'
import { cn } from '@/lib/utils'
import {
  defaultDueInput,
  formatBRL,
  formatDateTime,
  LEAD_SOURCES,
  localInputToIso,
  PROPERTY_TYPES,
  SERVICE_TYPE_LABELS,
  TASK_TYPE_LABELS,
} from '@/lib/crm/crm-utils'
import { Field, fieldCls, SelectField } from './crm-form'
import { CrmLossReasonDialog } from './CrmLossReasonDialog'

interface CrmLeadSheetProps {
  leadId: string | null
  pipelines: CrmPipeline[]
  lossReasons: CrmLossReason[]
  onClose: () => void
}

type Draft = {
  title: string
  value: string
  responsible: string
  source: string
  tags: string
  serviceType: string
  propertyType: string
  originAddress: string
  destinationAddress: string
  movingDate: string
  volumeM3: string
  needsPacking: boolean
  needsStorage: boolean
}

function toDraft(lead: CrmLead): Draft {
  return {
    title: lead.title,
    value: lead.value ? String(lead.value) : '',
    responsible: lead.responsible ?? '',
    source: lead.source ?? '',
    tags: lead.tags.join(', '),
    serviceType: lead.serviceType ?? '',
    propertyType: lead.propertyType ?? '',
    originAddress: lead.originAddress ?? '',
    destinationAddress: lead.destinationAddress ?? '',
    movingDate: lead.movingDate ?? '',
    volumeM3: lead.volumeM3 !== null ? String(lead.volumeM3) : '',
    needsPacking: lead.needsPacking,
    needsStorage: lead.needsStorage,
  }
}

/** Card completo do lead (painel lateral): campos à esquerda, feed/timeline à direita. */
export function CrmLeadSheet({ leadId, pipelines, lossReasons, onClose }: CrmLeadSheetProps) {
  const detail = useCrmLeadDetail(leadId)
  const lead = detail.lead
  const pipeline = pipelines.find((p) => p.id === lead?.pipelineId) ?? null

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-5xl p-0 gap-0 overflow-hidden">
        <SheetTitle className="sr-only">{lead?.title ?? 'Lead'}</SheetTitle>
        <SheetDescription className="sr-only">Detalhes, tarefas e histórico do lead</SheetDescription>
        {!lead || !pipeline ? (
          <div className="flex h-full items-center justify-center">
            {detail.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            ) : (
              <p className="text-sm text-[var(--ds-text-muted)]">Lead não encontrado.</p>
            )}
          </div>
        ) : (
          <LeadSheetBody key={lead.id} lead={lead} pipeline={pipeline} lossReasons={lossReasons} detail={detail} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function LeadSheetBody({
  lead,
  pipeline,
  lossReasons,
  detail,
  onClose,
}: {
  lead: CrmLead
  pipeline: CrmPipeline
  lossReasons: CrmLossReason[]
  detail: ReturnType<typeof useCrmLeadDetail>
  onClose: () => void
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(() => toDraft(lead))
  const [lostPending, setLostPending] = useState<string | null>(null)
  const [openingChat, setOpeningChat] = useState(false)

  useEffect(() => setDraft(toDraft(lead)), [lead])

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(toDraft(lead)), [draft, lead])
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const currentStage = pipeline.stages.find((s) => s.id === lead.stageId)

  const save = async () => {
    try {
      await detail.updateLead({
        title: draft.title.trim() || lead.title,
        value: draft.value ? Number(draft.value) : 0,
        responsible: draft.responsible.trim() || null,
        source: draft.source || null,
        tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
        serviceType: (draft.serviceType || null) as CrmServiceType | null,
        propertyType: draft.propertyType || null,
        originAddress: draft.originAddress.trim() || null,
        destinationAddress: draft.destinationAddress.trim() || null,
        movingDate: draft.movingDate || null,
        volumeM3: draft.volumeM3 ? Number(draft.volumeM3) : null,
        needsPacking: draft.needsPacking,
        needsStorage: draft.needsStorage,
      })
    } catch {
      /* toast exibido pelo hook */
    }
  }

  const changeStage = (stageId: string) => {
    if (stageId === lead.stageId) return
    const stage = pipeline.stages.find((s) => s.id === stageId)
    if (stage?.type === 'lost') {
      setLostPending(stageId)
      return
    }
    detail.updateLead({ stageId }).catch(() => {})
  }

  const openChat = async () => {
    if (!lead.contactId) {
      toast.info('Este lead não tem contato vinculado.')
      return
    }
    setOpeningChat(true)
    try {
      const { conversationId } = await detail.findConversation()
      if (conversationId) router.push(`/inbox?c=${encodeURIComponent(conversationId)}`)
      else toast.info('Ainda não há conversa no Inbox com este contato.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao abrir conversa')
    } finally {
      setOpeningChat(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Excluir o lead "${lead.title}"? Esta ação não pode ser desfeita.`)) return
    try {
      await detail.deleteLead()
      onClose()
    } catch {
      /* toast exibido pelo hook */
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho */}
      <header className="border-b border-[var(--ds-border-subtle)] px-5 pt-5 pb-3 pr-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-[var(--ds-text-muted)]">
              {pipeline.name} · #{lead.id.slice(0, 8)}
            </p>
            <h2 className="text-lg font-semibold text-[var(--ds-text-primary)] truncate">{lead.title}</h2>
            <p className="text-sm font-medium text-primary-400">{formatBRL(lead.value)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openChat} disabled={openingChat}>
              {openingChat ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              Conversa
            </Button>
            <Button variant="ghost-destructive" size="icon-sm" onClick={remove} aria-label="Excluir lead">
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Barra de etapas (clicável, como no Kommo) */}
        <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Etapa do lead">
          {pipeline.stages.map((stage) => {
            const active = stage.id === lead.stageId
            const passed = currentStage && stage.type === 'open' && stage.sortOrder < currentStage.sortOrder
            return (
              <button
                key={stage.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeStage(stage.id)}
                title={stage.name}
                className="group flex-1 min-w-0"
              >
                <span
                  className={cn('block h-1.5 rounded-full transition-opacity', active || passed ? 'opacity-100' : 'opacity-25 group-hover:opacity-60')}
                  style={{ backgroundColor: stage.color }}
                />
                <span className={cn('mt-1 block truncate text-[10px]', active ? 'text-[var(--ds-text-primary)] font-semibold' : 'text-[var(--ds-text-muted)]')}>
                  {stage.name}
                </span>
              </button>
            )
          })}
        </div>
        {lead.lossReason && currentStage?.type === 'lost' && (
          <p className="mt-2 text-xs text-red-400">Motivo da perda: {lead.lossReason}</p>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(300px,380px)_1fr] md:overflow-hidden">
        {/* Campos */}
        <section className="space-y-3 border-b border-[var(--ds-border-subtle)] p-5 md:overflow-y-auto md:border-b-0 md:border-r" aria-label="Dados do lead">
          {lead.contact && (
            <div className="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)] p-3 text-sm">
              <p className="text-xs text-[var(--ds-text-muted)]">Contato</p>
              <p className="font-medium text-[var(--ds-text-primary)]">{lead.contact.name || 'Sem nome'}</p>
              <p className="text-[var(--ds-text-secondary)]">{lead.contact.phone}</p>
              {lead.contact.email && <p className="text-[var(--ds-text-secondary)]">{lead.contact.email}</p>}
            </div>
          )}

          <Field label="Nome do lead">
            <input className={fieldCls} value={draft.title} onChange={(e) => set('title')(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input type="number" min="0" step="0.01" className={fieldCls} value={draft.value} onChange={(e) => set('value')(e.target.value)} />
            </Field>
            <Field label="Responsável">
              <input className={fieldCls} value={draft.responsible} onChange={(e) => set('responsible')(e.target.value)} />
            </Field>
          </div>
          <Field label="Origem do lead">
            <SelectField value={draft.source} onChange={set('source')} placeholder="—" options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />
          </Field>
          <Field label="Tags (separadas por vírgula)">
            <input className={fieldCls} value={draft.tags} onChange={(e) => set('tags')(e.target.value)} />
          </Field>

          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">Mudança</p>
          <Field label="Tipo de serviço">
            <SelectField
              value={draft.serviceType}
              onChange={set('serviceType')}
              placeholder="—"
              options={Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Tipo de imóvel">
            <SelectField value={draft.propertyType} onChange={set('propertyType')} placeholder="—" options={PROPERTY_TYPES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Endereço de origem">
            <input className={fieldCls} value={draft.originAddress} onChange={(e) => set('originAddress')(e.target.value)} />
          </Field>
          <Field label="Endereço de destino">
            <input className={fieldCls} value={draft.destinationAddress} onChange={(e) => set('destinationAddress')(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data da mudança">
              <input type="date" className={fieldCls} value={draft.movingDate} onChange={(e) => set('movingDate')(e.target.value)} />
            </Field>
            <Field label="Volume (m³)">
              <input type="number" min="0" step="0.1" className={fieldCls} value={draft.volumeM3} onChange={(e) => set('volumeM3')(e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--ds-text-secondary)]">
            <input type="checkbox" checked={draft.needsPacking} onChange={(e) => set('needsPacking')(e.target.checked)} className="accent-emerald-500" />
            Precisa de embalagem / desmontagem
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--ds-text-secondary)]">
            <input type="checkbox" checked={draft.needsStorage} onChange={(e) => set('needsStorage')(e.target.checked)} className="accent-emerald-500" />
            Precisa de guarda-móveis
          </label>

          <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-bg-base)] px-5 py-3">
            <Button variant="outline" size="sm" disabled={!isDirty} onClick={() => setDraft(toDraft(lead))}>
              Descartar
            </Button>
            <Button variant="brand" size="sm" disabled={!isDirty || detail.isSaving} onClick={save}>
              {detail.isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </section>

        {/* Feed */}
        <LeadFeed detail={detail} />
      </div>

      <CrmLossReasonDialog
        open={!!lostPending}
        reasons={lossReasons}
        onCancel={() => setLostPending(null)}
        onConfirm={(reason) => {
          const stageId = lostPending!
          setLostPending(null)
          detail.updateLead({ stageId, lossReason: reason }).catch(() => {})
        }}
      />
    </div>
  )
}

const EVENT_ICONS = {
  note: StickyNote,
  created: PlusCircle,
  stage_change: ArrowRightLeft,
  task_created: Clock,
  task_completed: CheckCircle2,
  updated: ArrowRightLeft,
} as const

function LeadFeed({ detail }: { detail: ReturnType<typeof useCrmLeadDetail> }) {
  const [mode, setMode] = useState<'note' | 'task'>('note')
  const [note, setNote] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskType, setTaskType] = useState<CrmTaskType>('follow_up')
  const [taskDue, setTaskDue] = useState(defaultDueInput)

  const openTasks = detail.tasks.filter((t) => !t.completedAt)
  const feed: CrmLeadEvent[] = useMemo(
    () => [...detail.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [detail.events]
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'note') {
        if (!note.trim()) return
        await detail.addNote(note.trim())
        setNote('')
      } else {
        if (!taskTitle.trim() || !taskDue) return
        await detail.createTask({ title: taskTitle.trim(), type: taskType, dueAt: localInputToIso(taskDue) })
        setTaskTitle('')
        setTaskDue(defaultDueInput())
      }
    } catch {
      /* toast exibido pelo hook */
    }
  }

  return (
    <section className="flex min-h-[400px] flex-col bg-[var(--ds-bg-surface)]/40 md:min-h-0" aria-label="Feed do lead">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {openTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">Tarefas em aberto</p>
            {openTasks.map((task) => {
              const overdue = new Date(task.dueAt).getTime() < Date.now()
              return (
                <div key={task.id} className={cn('flex items-center gap-3 rounded-lg border p-3', overdue ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/30 bg-amber-500/5')}>
                  <button
                    type="button"
                    onClick={() => detail.updateTask(task.id, { completed: true })}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--ds-border-strong)] text-transparent hover:border-primary-500 hover:text-primary-400"
                    aria-label={`Concluir ${task.title}`}
                  >
                    <Check size={12} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--ds-text-primary)]">
                      <span className="mr-1.5 text-[10px] uppercase text-[var(--ds-text-muted)]">{TASK_TYPE_LABELS[task.type]}</span>
                      {task.title}
                    </p>
                    <p className={cn('text-xs', overdue ? 'text-red-400' : 'text-[var(--ds-text-muted)]')}>
                      {overdue ? 'Atrasada · ' : ''}
                      {formatDateTime(task.dueAt)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">Histórico</p>
          {feed.length === 0 && <p className="text-sm text-[var(--ds-text-muted)]">Sem eventos ainda.</p>}
          {feed.map((event) => {
            const Icon = EVENT_ICONS[event.type] ?? StickyNote
            const isNote = event.type === 'note'
            return (
              <div key={event.id} className="flex gap-3">
                <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', isNote ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-muted)]')}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[var(--ds-text-muted)]">{formatDateTime(event.createdAt)}</p>
                  <p className={cn('whitespace-pre-wrap text-sm', isNote ? 'text-[var(--ds-text-primary)]' : 'text-[var(--ds-text-secondary)]')}>
                    {event.content}
                  </p>
                </div>
              </div>
            )
          })}
          {detail.tasks.filter((t) => t.completedAt).length > 0 && (
            <CompletedTasks tasks={detail.tasks.filter((t) => t.completedAt)} onReopen={(id) => detail.updateTask(id, { completed: false })} />
          )}
        </div>
      </div>

      {/* Composer: nota ou tarefa */}
      <form onSubmit={submit} className="border-t border-[var(--ds-border-subtle)] p-4 space-y-2">
        <div className="flex gap-1" role="tablist" aria-label="Tipo de registro">
          {(['note', 'task'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn('rounded-md px-3 py-1 text-xs font-medium', mode === m ? 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-primary)]' : 'text-[var(--ds-text-muted)]')}
            >
              {m === 'note' ? 'Nota' : 'Tarefa'}
            </button>
          ))}
        </div>
        {mode === 'note' ? (
          <textarea
            className={cn(fieldCls, 'min-h-[72px] resize-y')}
            placeholder="Escreva uma nota sobre o lead…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Nota"
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_190px]">
            <input className={fieldCls} placeholder="Ex.: Ligar para confirmar vistoria" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} aria-label="Título da tarefa" />
            <SelectField
              value={taskType}
              onChange={(v) => setTaskType(v as CrmTaskType)}
              options={Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              ariaLabel="Tipo de tarefa"
            />
            <input type="datetime-local" className={fieldCls} value={taskDue} onChange={(e) => setTaskDue(e.target.value)} aria-label="Prazo" />
          </div>
        )}
        <div className="flex justify-end">
          <Button
            variant="brand"
            size="sm"
            type="submit"
            disabled={mode === 'note' ? !note.trim() || detail.isAddingNote : !taskTitle.trim() || detail.isCreatingTask}
          >
            {mode === 'note' ? 'Adicionar nota' : 'Criar tarefa'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function CompletedTasks({ tasks, onReopen }: { tasks: CrmTask[]; onReopen: (id: string) => void }) {
  return (
    <details className="rounded-lg border border-[var(--ds-border-subtle)] p-3">
      <summary className="cursor-pointer text-xs text-[var(--ds-text-muted)]">Tarefas concluídas ({tasks.length})</summary>
      <ul className="mt-2 space-y-1.5">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-2 text-sm text-[var(--ds-text-secondary)]">
            <span className="line-through opacity-70 truncate">{t.title}</span>
            <button type="button" onClick={() => onReopen(t.id)} className="rounded p-1 hover:bg-[var(--ds-bg-hover)]" aria-label={`Reabrir ${t.title}`}>
              <RotateCcw size={12} />
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
