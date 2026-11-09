/**
 * Utilitários puros do CRM (formatação, ordenação do Kanban, agrupamento de tarefas)
 */
import type { CrmLead, CrmServiceType, CrmTask, CrmTaskType } from '@/types'

export const SERVICE_TYPE_LABELS: Record<CrmServiceType, string> = {
  residencial: 'Mudança residencial',
  comercial: 'Mudança comercial',
  interestadual: 'Mudança interestadual',
  guarda_moveis: 'Guarda-móveis',
  carreto: 'Carreto / frete pequeno',
}

export const TASK_TYPE_LABELS: Record<CrmTaskType, string> = {
  call: 'Ligar',
  meeting: 'Reunião',
  visit: 'Vistoria técnica',
  follow_up: 'Follow-up',
  email: 'E-mail',
  other: 'Outro',
}

export const PROPERTY_TYPES = ['Apartamento', 'Casa', 'Sobrado', 'Kitnet / Studio', 'Escritório', 'Loja', 'Galpão']

export const LEAD_SOURCES = ['WhatsApp', 'Instagram', 'Facebook', 'Google', 'Site', 'Indicação', 'Telefone', 'Outro']

export const STAGE_COLORS = [
  '#94a3b8', '#38bdf8', '#3b82f6', '#a78bfa', '#f472b6', '#fbbf24', '#fb923c', '#2dd4bf', '#22c55e', '#ef4444',
]

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export function formatBRL(value: number): string {
  return brl.format(Number.isFinite(value) ? value : 0)
}

/** Soma e contagem de uma coluna (exibido no topo da etapa, como no Kommo). */
export function summarizeLeads(leads: Pick<CrmLead, 'value'>[]): { count: number; total: number } {
  return { count: leads.length, total: leads.reduce((acc, l) => acc + (Number(l.value) || 0), 0) }
}

/**
 * Calcula sort_order para inserir um card entre dois vizinhos (ordenação fracionária).
 * Evita reordenar a coluna inteira a cada drag & drop.
 */
export function computeSortOrder(before?: number | null, after?: number | null): number {
  const hasBefore = typeof before === 'number' && Number.isFinite(before)
  const hasAfter = typeof after === 'number' && Number.isFinite(after)
  if (hasBefore && hasAfter) return (before! + after!) / 2
  if (hasBefore) return before! + 1
  if (hasAfter) return after! - 1
  return 0
}

export type TaskBucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'

export const TASK_BUCKET_LABELS: Record<TaskBucket, string> = {
  overdue: 'Atrasadas',
  today: 'Hoje',
  tomorrow: 'Amanhã',
  week: 'Próximos 7 dias',
  later: 'Depois',
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function getTaskBucket(dueAt: string, now: Date = new Date()): TaskBucket {
  const due = new Date(dueAt)
  if (due.getTime() < now.getTime()) return 'overdue'
  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / dayMs)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays <= 7) return 'week'
  return 'later'
}

export function groupTasks(tasks: CrmTask[], now: Date = new Date()): Record<TaskBucket, CrmTask[]> {
  const groups: Record<TaskBucket, CrmTask[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [] }
  for (const task of tasks) groups[getTaskBucket(task.dueAt, now)].push(task)
  return groups
}

/** Dias desde a última mudança de etapa (indicador de lead "parado"). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const diff = now.getTime() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(isoDate: string): string {
  // Datas "YYYY-MM-DD" sem fuso: evita deslocamento de dia
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Converte valor de <input type="datetime-local"> para ISO com offset. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

/** Valor padrão para <input type="datetime-local">: amanhã 09:00. */
export function defaultDueInput(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
