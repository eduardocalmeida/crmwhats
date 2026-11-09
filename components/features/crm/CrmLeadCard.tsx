'use client'

import { CalendarDays, Clock, MapPin, Phone, User } from 'lucide-react'
import type { CrmLead } from '@/types'
import { cn } from '@/lib/utils'
import { daysSince, formatBRL, formatDate, formatDateTime } from '@/lib/crm/crm-utils'

interface CrmLeadCardProps {
  lead: CrmLead
  isDragging?: boolean
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

/** Card do lead no Kanban (estilo Kommo: título, contato, valor, próxima tarefa). */
export function CrmLeadCard({ lead, isDragging, onClick, onDragStart, onDragEnd }: CrmLeadCardProps) {
  const nextTask = lead.nextTask
  const taskOverdue = nextTask ? new Date(nextTask.dueAt).getTime() < Date.now() : false
  const idleDays = daysSince(lead.stageChangedAt)

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'group rounded-lg border border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] p-3 text-left cursor-grab active:cursor-grabbing',
        'hover:border-[var(--ds-border-strong)] hover:shadow-md transition-all',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
        isDragging && 'opacity-40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[var(--ds-text-primary)] line-clamp-2">{lead.title}</p>
        {lead.value > 0 && (
          <span className="shrink-0 text-xs font-semibold text-primary-400">{formatBRL(lead.value)}</span>
        )}
      </div>

      {lead.contact && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--ds-text-secondary)]">
          <User size={12} aria-hidden="true" />
          <span className="truncate">{lead.contact.name || lead.contact.phone}</span>
          {lead.contact.name && (
            <>
              <Phone size={11} className="ml-1 shrink-0" aria-hidden="true" />
              <span className="truncate">{lead.contact.phone}</span>
            </>
          )}
        </div>
      )}

      {(lead.originAddress || lead.destinationAddress) && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)]">
          <MapPin size={12} className="shrink-0" aria-hidden="true" />
          <span className="truncate">
            {lead.originAddress || '?'} → {lead.destinationAddress || '?'}
          </span>
        </div>
      )}

      {lead.movingDate && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)]">
          <CalendarDays size={12} aria-hidden="true" />
          <span>Mudança em {formatDate(lead.movingDate)}</span>
        </div>
      )}

      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded px-1.5 py-0.5 text-[10px] bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)]">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        {nextTask ? (
          <span
            className={cn('flex items-center gap-1 truncate', taskOverdue ? 'text-red-400' : 'text-[var(--ds-text-muted)]')}
            title={nextTask.title}
          >
            <Clock size={11} aria-hidden="true" />
            <span className="truncate">{formatDateTime(nextTask.dueAt)} · {nextTask.title}</span>
          </span>
        ) : lead.closedAt ? (
          <span />
        ) : (
          <span className="text-amber-400/80">Sem tarefa</span>
        )}
        {lead.responsible && (
          <span className="shrink-0 truncate max-w-[40%] text-[var(--ds-text-muted)]">{lead.responsible}</span>
        )}
      </div>
      {idleDays >= 7 && !lead.closedAt && (
        <p className="mt-1 text-[10px] text-amber-400/80">Parado há {idleDays} dias nesta etapa</p>
      )}
    </div>
  )
}
