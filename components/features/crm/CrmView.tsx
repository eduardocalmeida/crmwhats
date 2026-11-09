'use client'

import { KanbanSquare, List, ListTodo, Loader2, Plus, Search, Settings2 } from 'lucide-react'
import type { CrmController } from '@/hooks/useCrm'
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/crm/crm-utils'
import { CrmKanbanBoard } from './CrmKanbanBoard'
import { CrmLeadList } from './CrmLeadList'
import { CrmTasksPanel } from './CrmTasksPanel'
import { CrmNewLeadDialog } from './CrmNewLeadDialog'
import { CrmPipelineSettingsDialog } from './CrmPipelineSettingsDialog'
import { CrmLossReasonDialog } from './CrmLossReasonDialog'
import { CrmLeadSheet } from './CrmLeadSheet'

const VIEWS = [
  { id: 'kanban', label: 'Funil', icon: KanbanSquare },
  { id: 'list', label: 'Lista', icon: List },
  { id: 'tasks', label: 'Tarefas', icon: ListTodo },
] as const

/** CRM de vendas (modelo Kommo) — view presentacional ligada ao useCrmController. */
export function CrmView({ controller: c }: { controller: CrmController }) {
  const pipeline = c.activePipeline

  return (
    <Page className="flex h-full min-h-0 flex-col space-y-5">
      <PageHeader>
        <div>
          <PageTitle>CRM</PageTitle>
          <PageDescription>Funil de vendas da Mude Bem — do primeiro contato à mudança agendada</PageDescription>
        </div>
        <PageActions className="flex-wrap justify-start sm:justify-end">
          {pipeline && (
            <>
              <select
                value={pipeline.id}
                onChange={(e) => {
                  if (e.target.value === '__new') {
                    const name = window.prompt('Nome do novo funil')
                    if (name?.trim()) c.createPipeline(name.trim())
                    return
                  }
                  c.setPipelineId(e.target.value)
                }}
                className="h-9 rounded-lg border border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] px-3 text-sm text-[var(--ds-text-primary)]"
                aria-label="Funil"
              >
                {c.pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="__new">+ Novo funil…</option>
              </select>
              <Button variant="outline" size="icon" onClick={() => c.setIsPipelineSettingsOpen(true)} aria-label="Configurar funil" title="Configurar funil">
                <Settings2 size={16} />
              </Button>
              <Button variant="brand" onClick={() => c.setIsNewLeadOpen(true)}>
                <Plus size={16} /> Novo lead
              </Button>
            </>
          )}
        </PageActions>
      </PageHeader>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Leads em aberto" value={String(c.stats.open.count)} hint={formatBRL(c.stats.open.total)} />
        <Stat label="Ganhos" value={String(c.stats.won.count)} hint={formatBRL(c.stats.won.total)} tone="success" />
        <Stat label="Perdidos" value={String(c.stats.lost.count)} hint={formatBRL(c.stats.lost.total)} tone="error" />
        <Stat label="Conversão" value={`${c.stats.conversionRate}%`} hint="ganhos / fechados" />
        <Stat label="Tarefas atrasadas" value={String(c.stats.overdueTasks)} hint="em todos os funis" tone={c.stats.overdueTasks > 0 ? 'error' : undefined} />
      </div>

      {/* Barra de visão + busca */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[var(--ds-border-default)] p-0.5" role="tablist" aria-label="Visualização">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={c.view === v.id}
              onClick={() => c.setView(v.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm',
                c.view === v.id ? 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-primary)]' : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text-secondary)]'
              )}
            >
              <v.icon size={15} aria-hidden="true" /> {v.label}
            </button>
          ))}
        </div>
        {c.view !== 'tasks' && (
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)]" aria-hidden="true" />
            <input
              type="search"
              value={c.searchInput}
              onChange={(e) => c.setSearchInput(e.target.value)}
              placeholder="Buscar lead ou endereço…"
              className="h-9 w-full rounded-lg border border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] pl-9 pr-3 text-sm text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:border-primary-500"
              aria-label="Buscar leads"
            />
          </div>
        )}
      </div>

      <div className="min-h-[420px] flex-1">
        {c.error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-300">
            Erro ao carregar o CRM: {c.error}. Verifique se a migration do CRM foi aplicada no banco.
          </div>
        ) : c.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : !pipeline ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--ds-text-muted)]">Nenhum funil encontrado.</p>
            <Button variant="brand" className="mt-4" onClick={() => c.createPipeline('Mudanças')}>
              Criar funil de mudanças
            </Button>
          </div>
        ) : c.view === 'kanban' ? (
          <CrmKanbanBoard
            pipeline={pipeline}
            leadsByStage={c.leadsByStage}
            onMoveLead={c.moveLead}
            onOpenLead={c.setSelectedLeadId}
            onQuickAdd={c.createLead}
          />
        ) : c.view === 'list' ? (
          <CrmLeadList pipeline={pipeline} leads={c.leads} onOpenLead={c.setSelectedLeadId} />
        ) : (
          <CrmTasksPanel onOpenLead={c.setSelectedLeadId} />
        )}
      </div>

      {pipeline && (
        <>
          <CrmNewLeadDialog open={c.isNewLeadOpen} onOpenChange={c.setIsNewLeadOpen} pipeline={pipeline} onCreate={c.createLead} isCreating={c.isCreatingLead} />
          <CrmPipelineSettingsDialog
            open={c.isPipelineSettingsOpen}
            onOpenChange={c.setIsPipelineSettingsOpen}
            pipeline={pipeline}
            canDelete={c.pipelines.length > 1}
            onSave={c.savePipeline}
            onDelete={c.deletePipeline}
            isSaving={c.isSavingPipeline}
          />
        </>
      )}
      <CrmLossReasonDialog open={!!c.pendingLost} reasons={c.lossReasons} onConfirm={c.confirmLost} onCancel={c.cancelLost} />
      <CrmLeadSheet leadId={c.selectedLeadId} pipelines={c.pipelines} lossReasons={c.lossReasons} onClose={() => c.setSelectedLeadId(null)} />
    </Page>
  )
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'success' | 'error' }) {
  return (
    <div className="rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-elevated)] px-4 py-3">
      <p className="text-xs text-[var(--ds-text-muted)]">{label}</p>
      <p className={cn('text-xl font-semibold', tone === 'success' ? 'text-primary-400' : tone === 'error' ? 'text-red-400' : 'text-[var(--ds-text-primary)]')}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-[var(--ds-text-muted)]">{hint}</p>}
    </div>
  )
}
