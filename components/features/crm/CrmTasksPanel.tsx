'use client'

import { useState } from 'react'
import { Check, RotateCcw, Trash2 } from 'lucide-react'
import { useCrmTasksController } from '@/hooks/useCrm'
import { cn } from '@/lib/utils'
import {
  formatDateTime,
  groupTasks,
  TASK_BUCKET_LABELS,
  TASK_TYPE_LABELS,
  type TaskBucket,
} from '@/lib/crm/crm-utils'

const BUCKETS: TaskBucket[] = ['overdue', 'today', 'tomorrow', 'week', 'later']

/** Aba de Tarefas (equivalente a "Tarefas" do Kommo): agrupadas por prazo. */
export function CrmTasksPanel({ onOpenLead }: { onOpenLead: (leadId: string) => void }) {
  const [status, setStatus] = useState<'open' | 'done'>('open')
  const controller = useCrmTasksController(status)
  const groups = groupTasks(controller.tasks)

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-[var(--ds-border-default)] p-0.5" role="tablist" aria-label="Status das tarefas">
        {(['open', 'done'] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={status === s}
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium',
              status === s ? 'bg-[var(--ds-bg-hover)] text-[var(--ds-text-primary)]' : 'text-[var(--ds-text-muted)]'
            )}
          >
            {s === 'open' ? 'Em aberto' : 'Concluídas'}
          </button>
        ))}
      </div>

      {controller.isLoading && <p className="text-sm text-[var(--ds-text-muted)]">Carregando tarefas…</p>}
      {!controller.isLoading && controller.tasks.length === 0 && (
        <p className="py-16 text-center text-sm text-[var(--ds-text-muted)]">
          {status === 'open' ? 'Nenhuma tarefa pendente. Crie tarefas a partir do card do lead.' : 'Nenhuma tarefa concluída.'}
        </p>
      )}

      {status === 'done' ? (
        <TaskList tasks={controller.tasks} controller={controller} onOpenLead={onOpenLead} done />
      ) : (
        BUCKETS.filter((b) => groups[b].length > 0).map((bucket) => (
          <section key={bucket} className="space-y-2">
            <h3 className={cn('text-xs font-semibold uppercase tracking-wide', bucket === 'overdue' ? 'text-red-400' : 'text-[var(--ds-text-secondary)]')}>
              {TASK_BUCKET_LABELS[bucket]} ({groups[bucket].length})
            </h3>
            <TaskList tasks={groups[bucket]} controller={controller} onOpenLead={onOpenLead} overdue={bucket === 'overdue'} />
          </section>
        ))
      )}
    </div>
  )
}

function TaskList({
  tasks,
  controller,
  onOpenLead,
  overdue,
  done,
}: {
  tasks: ReturnType<typeof useCrmTasksController>['tasks']
  controller: ReturnType<typeof useCrmTasksController>
  onOpenLead: (leadId: string) => void
  overdue?: boolean
  done?: boolean
}) {
  return (
    <ul className="divide-y divide-[var(--ds-border-subtle)] rounded-xl border border-[var(--ds-border-subtle)] bg-[var(--ds-bg-surface)]/60">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => (done ? controller.reopenTask(task.id) : controller.completeTask(task.id))}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
              done ? 'border-primary-500 bg-primary-500/20 text-primary-400' : 'border-[var(--ds-border-strong)] text-transparent hover:text-primary-400 hover:border-primary-500'
            )}
            aria-label={done ? `Reabrir tarefa ${task.title}` : `Concluir tarefa ${task.title}`}
            title={done ? 'Reabrir' : 'Concluir'}
          >
            {done ? <RotateCcw size={12} /> : <Check size={12} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm text-[var(--ds-text-primary)]', done && 'line-through opacity-70')}>
              <span className="mr-2 rounded bg-[var(--ds-bg-hover)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--ds-text-secondary)]">
                {TASK_TYPE_LABELS[task.type]}
              </span>
              {task.title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--ds-text-muted)]">
              <span className={cn(overdue && 'text-red-400')}>{formatDateTime(task.dueAt)}</span>
              {task.responsible && ` · ${task.responsible}`}
              {task.leadId && (
                <>
                  {' · '}
                  <button type="button" className="text-primary-400 hover:underline" onClick={() => onOpenLead(task.leadId!)}>
                    {task.leadTitle || 'Abrir lead'}
                  </button>
                </>
              )}
              {task.result && ` · Resultado: ${task.result}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => controller.deleteTask(task.id)}
            className="rounded p-1.5 text-[var(--ds-text-muted)] hover:bg-red-500/10 hover:text-red-400"
            aria-label={`Excluir tarefa ${task.title}`}
          >
            <Trash2 size={14} />
          </button>
        </li>
      ))}
    </ul>
  )
}
