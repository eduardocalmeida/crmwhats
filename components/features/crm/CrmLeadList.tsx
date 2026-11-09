'use client'

import type { CrmLead, CrmPipeline } from '@/types'
import { formatBRL, formatDate, formatDateTime, SERVICE_TYPE_LABELS } from '@/lib/crm/crm-utils'

interface CrmLeadListProps {
  pipeline: CrmPipeline
  leads: CrmLead[]
  onOpenLead: (id: string) => void
}

/** Visão em lista dos leads (equivalente à "Lista" do Kommo). */
export function CrmLeadList({ pipeline, leads, onOpenLead }: CrmLeadListProps) {
  const stageById = new Map(pipeline.stages.map((s) => [s.id, s]))

  if (leads.length === 0) {
    return <p className="py-16 text-center text-sm text-[var(--ds-text-muted)]">Nenhum lead encontrado neste funil.</p>
  }

  return (
    <div className="overflow-auto rounded-xl border border-[var(--ds-border-subtle)]">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="sticky top-0 bg-[var(--ds-bg-surface)] text-left text-xs uppercase tracking-wide text-[var(--ds-text-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Contato</th>
            <th className="px-4 py-3 font-medium">Etapa</th>
            <th className="px-4 py-3 font-medium">Serviço</th>
            <th className="px-4 py-3 font-medium">Data da mudança</th>
            <th className="px-4 py-3 font-medium text-right">Valor</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const stage = stageById.get(lead.stageId)
            return (
              <tr
                key={lead.id}
                onClick={() => onOpenLead(lead.id)}
                className="cursor-pointer border-t border-[var(--ds-border-subtle)] hover:bg-[var(--ds-bg-hover)]"
              >
                <td className="px-4 py-3 font-medium text-[var(--ds-text-primary)]">
                  <button type="button" className="text-left hover:underline" onClick={() => onOpenLead(lead.id)}>
                    {lead.title}
                  </button>
                </td>
                <td className="px-4 py-3 text-[var(--ds-text-secondary)]">
                  {lead.contact ? lead.contact.name || lead.contact.phone : '—'}
                </td>
                <td className="px-4 py-3">
                  {stage && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--ds-text-secondary)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden="true" />
                      {stage.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--ds-text-secondary)]">
                  {lead.serviceType ? SERVICE_TYPE_LABELS[lead.serviceType] : '—'}
                </td>
                <td className="px-4 py-3 text-[var(--ds-text-secondary)]">{lead.movingDate ? formatDate(lead.movingDate) : '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-primary-400">{formatBRL(lead.value)}</td>
                <td className="px-4 py-3 text-[var(--ds-text-secondary)]">{lead.responsible || '—'}</td>
                <td className="px-4 py-3 text-[var(--ds-text-muted)]">{formatDateTime(lead.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
