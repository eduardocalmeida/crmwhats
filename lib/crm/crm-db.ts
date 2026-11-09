/**
 * CRM Database Layer (modelo Kommo — Mude Bem)
 *
 * Funis, etapas, leads, tarefas, timeline e motivos de perda.
 * Usa getSupabaseAdmin (service role) — chamado apenas por API routes.
 */

import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizePhoneNumber } from '@/lib/phone-formatter'
import type {
  CreateCrmLeadDTO,
  CreateCrmTaskDTO,
  CrmLead,
  CrmLeadEvent,
  CrmLeadEventType,
  CrmLossReason,
  CrmPipeline,
  CrmStage,
  CrmTask,
  UpdateCrmLeadDTO,
  UpdateCrmTaskDTO,
  UpsertCrmStageDTO,
} from '@/types'

function getClient() {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error('Supabase admin client not configured. Check SUPABASE_SECRET_KEY env var.')
  }
  return client
}

// =============================================================================
// Mappers (snake_case → camelCase)
// =============================================================================

type Row = Record<string, any>

export function mapStage(row: Row): CrmStage {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    type: row.type,
  }
}

export function mapLead(row: Row): CrmLead {
  const contact = row.contact ?? null
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    stageId: row.stage_id,
    title: row.title,
    contactId: row.contact_id ?? null,
    contact: contact
      ? { id: contact.id, name: contact.name, phone: contact.phone, email: contact.email ?? null }
      : null,
    value: Number(row.value ?? 0),
    responsible: row.responsible ?? null,
    source: row.source ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    lossReason: row.loss_reason ?? null,
    serviceType: row.service_type ?? null,
    propertyType: row.property_type ?? null,
    originAddress: row.origin_address ?? null,
    destinationAddress: row.destination_address ?? null,
    movingDate: row.moving_date ?? null,
    volumeM3: row.volume_m3 === null || row.volume_m3 === undefined ? null : Number(row.volume_m3),
    needsPacking: !!row.needs_packing,
    needsStorage: !!row.needs_storage,
    customFields: row.custom_fields ?? {},
    sortOrder: Number(row.sort_order ?? 0),
    stageChangedAt: row.stage_changed_at,
    closedAt: row.closed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapTask(row: Row): CrmTask {
  return {
    id: row.id,
    leadId: row.lead_id ?? null,
    leadTitle: row.lead?.title ?? null,
    title: row.title,
    type: row.type,
    dueAt: row.due_at,
    responsible: row.responsible ?? null,
    completedAt: row.completed_at ?? null,
    result: row.result ?? null,
    createdAt: row.created_at,
  }
}

function mapEvent(row: Row): CrmLeadEvent {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type,
    content: row.content ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }
}

/** Converte DTO de lead (camelCase) em colunas do banco. Ignora campos ausentes. */
export function leadDtoToRow(dto: UpdateCrmLeadDTO): Row {
  const map: Record<string, string> = {
    pipelineId: 'pipeline_id',
    stageId: 'stage_id',
    title: 'title',
    contactId: 'contact_id',
    value: 'value',
    responsible: 'responsible',
    source: 'source',
    tags: 'tags',
    lossReason: 'loss_reason',
    serviceType: 'service_type',
    propertyType: 'property_type',
    originAddress: 'origin_address',
    destinationAddress: 'destination_address',
    movingDate: 'moving_date',
    volumeM3: 'volume_m3',
    needsPacking: 'needs_packing',
    needsStorage: 'needs_storage',
    sortOrder: 'sort_order',
  }
  const row: Row = {}
  for (const [key, column] of Object.entries(map)) {
    const value = (dto as Row)[key]
    if (value !== undefined) row[column] = value
  }
  return row
}

const LEAD_SELECT = '*, contact:contacts(id, name, phone, email)'

// =============================================================================
// Pipelines & Stages
// =============================================================================

export async function listPipelines(): Promise<CrmPipeline[]> {
  const supabase = getClient()
  const [pipelinesRes, stagesRes] = await Promise.all([
    supabase.from('crm_pipelines').select('*').order('sort_order').order('created_at'),
    supabase.from('crm_stages').select('*').order('sort_order'),
  ])
  if (pipelinesRes.error) throw pipelinesRes.error
  if (stagesRes.error) throw stagesRes.error

  const stages = (stagesRes.data || []).map(mapStage)
  return (pipelinesRes.data || []).map((p: Row) => ({
    id: p.id,
    name: p.name,
    isDefault: !!p.is_default,
    sortOrder: p.sort_order,
    stages: stages.filter((s) => s.pipelineId === p.id),
  }))
}

/** Etapas padrão de um funil novo (mesma estrutura do Kommo: abertas + Ganho/Perdido). */
const DEFAULT_NEW_PIPELINE_STAGES: UpsertCrmStageDTO[] = [
  { name: 'Leads de entrada', color: '#94a3b8', type: 'open' },
  { name: 'Primeiro contato', color: '#38bdf8', type: 'open' },
  { name: 'Negociação', color: '#fb923c', type: 'open' },
  { name: 'Ganho', color: '#22c55e', type: 'won' },
  { name: 'Perdido', color: '#ef4444', type: 'lost' },
]

export async function createPipeline(name: string): Promise<CrmPipeline> {
  const supabase = getClient()
  const { count } = await supabase.from('crm_pipelines').select('id', { count: 'exact', head: true })
  const { data, error } = await supabase
    .from('crm_pipelines')
    .insert({ name, is_default: (count ?? 0) === 0, sort_order: count ?? 0 })
    .select('*')
    .single()
  if (error) throw error

  const stages = await replaceStages(data.id, DEFAULT_NEW_PIPELINE_STAGES)
  return { id: data.id, name: data.name, isDefault: data.is_default, sortOrder: data.sort_order, stages }
}

export async function renamePipeline(id: string, name: string): Promise<void> {
  const { error } = await getClient()
    .from('crm_pipelines')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deletePipeline(id: string): Promise<void> {
  const supabase = getClient()
  const { count } = await supabase.from('crm_pipelines').select('id', { count: 'exact', head: true })
  if ((count ?? 0) <= 1) throw new Error('Não é possível excluir o único funil')
  const { error } = await supabase.from('crm_pipelines').delete().eq('id', id)
  if (error) throw error
}

/**
 * Substitui a lista de etapas de um funil (ordem = ordem do array).
 * Etapas removidas que ainda têm leads bloqueiam a operação.
 */
export async function replaceStages(pipelineId: string, stages: UpsertCrmStageDTO[]): Promise<CrmStage[]> {
  const supabase = getClient()

  if (!stages.some((s) => s.type === 'open')) throw new Error('O funil precisa de ao menos uma etapa aberta')
  if (stages.filter((s) => s.type === 'won').length !== 1) throw new Error('O funil precisa de exatamente uma etapa de Ganho')
  if (stages.filter((s) => s.type === 'lost').length !== 1) throw new Error('O funil precisa de exatamente uma etapa de Perdido')

  const { data: existing, error: existingError } = await supabase
    .from('crm_stages')
    .select('id')
    .eq('pipeline_id', pipelineId)
  if (existingError) throw existingError

  const keepIds = new Set(stages.map((s) => s.id).filter(Boolean) as string[])
  const removedIds = (existing || []).map((s: Row) => s.id as string).filter((id) => !keepIds.has(id))

  if (removedIds.length > 0) {
    const { count } = await supabase
      .from('crm_leads')
      .select('id', { count: 'exact', head: true })
      .in('stage_id', removedIds)
    if ((count ?? 0) > 0) {
      throw new Error('Mova os leads antes de excluir uma etapa que ainda possui leads')
    }
    const { error } = await supabase.from('crm_stages').delete().in('id', removedIds)
    if (error) throw error
  }

  // Ordenação: abertas na ordem dada, depois Ganho, depois Perdido (como no Kommo)
  const ordered = [
    ...stages.filter((s) => s.type === 'open'),
    ...stages.filter((s) => s.type === 'won'),
    ...stages.filter((s) => s.type === 'lost'),
  ]

  for (const [index, stage] of ordered.entries()) {
    const payload = { pipeline_id: pipelineId, name: stage.name, color: stage.color, type: stage.type, sort_order: index }
    const { error } = stage.id && keepIds.has(stage.id)
      ? await supabase.from('crm_stages').update(payload).eq('id', stage.id).eq('pipeline_id', pipelineId)
      : await supabase.from('crm_stages').insert(payload)
    if (error) throw error
  }

  const { data, error } = await supabase
    .from('crm_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('sort_order')
  if (error) throw error
  return (data || []).map(mapStage)
}

async function getStage(stageId: string): Promise<CrmStage | null> {
  const { data, error } = await getClient().from('crm_stages').select('*').eq('id', stageId).maybeSingle()
  if (error) throw error
  return data ? mapStage(data) : null
}

// =============================================================================
// Leads
// =============================================================================

export interface LeadFilters {
  pipelineId?: string
  search?: string
  contactId?: string
}

export async function listLeads(filters: LeadFilters = {}): Promise<CrmLead[]> {
  const supabase = getClient()
  let query = supabase.from('crm_leads').select(LEAD_SELECT).order('sort_order').order('created_at', { ascending: false })
  if (filters.pipelineId) query = query.eq('pipeline_id', filters.pipelineId)
  if (filters.contactId) query = query.eq('contact_id', filters.contactId)
  if (filters.search) {
    const term = filters.search.replace(/[%,()]/g, ' ').trim()
    if (term) query = query.or(`title.ilike.%${term}%,origin_address.ilike.%${term}%,destination_address.ilike.%${term}%`)
  }
  const { data, error } = await query.limit(2000)
  if (error) throw error

  const leads = (data || []).map(mapLead)
  if (leads.length === 0) return leads

  // Próxima tarefa aberta por lead (indicador do card)
  const { data: tasks, error: tasksError } = await supabase
    .from('crm_tasks')
    .select('id, lead_id, title, due_at')
    .is('completed_at', null)
    .in('lead_id', leads.map((l) => l.id))
    .order('due_at')
  if (tasksError) throw tasksError

  const nextByLead = new Map<string, { id: string; title: string; dueAt: string }>()
  for (const t of tasks || []) {
    if (!nextByLead.has(t.lead_id)) nextByLead.set(t.lead_id, { id: t.id, title: t.title, dueAt: t.due_at })
  }
  return leads.map((l) => ({ ...l, nextTask: nextByLead.get(l.id) ?? null }))
}

export async function getLead(id: string): Promise<CrmLead | null> {
  const { data, error } = await getClient().from('crm_leads').select(LEAD_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapLead(data) : null
}

/** Busca contato por telefone ou cria um novo (para "adição rápida" de lead). */
async function findOrCreateContact(phone: string, name?: string): Promise<string> {
  const supabase = getClient()
  const normalized = normalizePhoneNumber(phone)
  if (!normalized) throw new Error('Telefone inválido')

  const { data: existing, error } = await supabase.from('contacts').select('id').eq('phone', normalized).maybeSingle()
  if (error) throw error
  if (existing) return existing.id

  const { data: created, error: createError } = await supabase
    .from('contacts')
    .insert({ name: name?.trim() || '', phone: normalized, status: 'Opt-in', tags: [], custom_fields: {} })
    .select('id')
    .single()
  if (createError) throw createError
  return created.id
}

async function addEvent(leadId: string, type: CrmLeadEventType, content: string | null, metadata: Row = {}) {
  const { error } = await getClient().from('crm_lead_events').insert({ lead_id: leadId, type, content, metadata })
  if (error) console.error('[crm] Falha ao registrar evento', error)
}

export async function createLead(dto: CreateCrmLeadDTO): Promise<CrmLead> {
  const supabase = getClient()

  let stageId = dto.stageId
  if (!stageId) {
    const { data: firstStage, error } = await supabase
      .from('crm_stages')
      .select('id')
      .eq('pipeline_id', dto.pipelineId)
      .eq('type', 'open')
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!firstStage) throw new Error('Funil sem etapas abertas')
    stageId = firstStage.id
  }

  const stage = await getStage(stageId!)
  if (!stage || stage.pipelineId !== dto.pipelineId) throw new Error('Etapa inválida para este funil')

  let contactId = dto.contactId ?? null
  if (!contactId && dto.contactPhone) contactId = await findOrCreateContact(dto.contactPhone, dto.contactName)

  // Novo lead entra no topo da coluna
  const { data: top } = await supabase
    .from('crm_leads')
    .select('sort_order')
    .eq('stage_id', stageId!)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  const sortOrder = top ? Number(top.sort_order) - 1 : 0

  const row = {
    ...leadDtoToRow(dto),
    stage_id: stageId,
    contact_id: contactId,
    sort_order: sortOrder,
    closed_at: stage.type === 'open' ? null : new Date().toISOString(),
  }

  const { data, error } = await supabase.from('crm_leads').insert(row).select(LEAD_SELECT).single()
  if (error) throw error

  await addEvent(data.id, 'created', `Lead criado na etapa "${stage.name}"`, { stageId: stage.id })
  return mapLead(data)
}

export async function updateLead(id: string, dto: UpdateCrmLeadDTO): Promise<CrmLead | null> {
  const supabase = getClient()
  const current = await getLead(id)
  if (!current) return null

  const row: Row = { ...leadDtoToRow(dto), updated_at: new Date().toISOString() }

  // Mudança de etapa: registra na timeline e atualiza closed_at
  if (dto.stageId && dto.stageId !== current.stageId) {
    const [from, to] = await Promise.all([getStage(current.stageId), getStage(dto.stageId)])
    if (!to) throw new Error('Etapa não encontrada')
    const targetPipeline = dto.pipelineId ?? current.pipelineId
    if (to.pipelineId !== targetPipeline) throw new Error('Etapa inválida para este funil')

    row.stage_changed_at = new Date().toISOString()
    row.closed_at = to.type === 'open' ? null : new Date().toISOString()
    if (to.type !== 'lost' && dto.lossReason === undefined) row.loss_reason = null

    const reason = to.type === 'lost' && dto.lossReason ? ` — motivo: ${dto.lossReason}` : ''
    await addEvent(id, 'stage_change', `Etapa alterada: "${from?.name ?? '?'}" → "${to.name}"${reason}`, {
      fromStageId: current.stageId,
      toStageId: to.id,
    })
  }

  const { data, error } = await supabase.from('crm_leads').update(row).eq('id', id).select(LEAD_SELECT).maybeSingle()
  if (error) throw error
  return data ? mapLead(data) : null
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await getClient().from('crm_leads').delete().eq('id', id)
  if (error) throw error
}

// =============================================================================
// Timeline (notas e eventos)
// =============================================================================

export async function listLeadEvents(leadId: string): Promise<CrmLeadEvent[]> {
  const { data, error } = await getClient()
    .from('crm_lead_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []).map(mapEvent)
}

export async function addLeadNote(leadId: string, content: string): Promise<CrmLeadEvent> {
  const { data, error } = await getClient()
    .from('crm_lead_events')
    .insert({ lead_id: leadId, type: 'note', content })
    .select('*')
    .single()
  if (error) throw error
  return mapEvent(data)
}

// =============================================================================
// Tarefas
// =============================================================================

export interface TaskFilters {
  leadId?: string
  status?: 'open' | 'done' | 'all'
}

export async function listTasks(filters: TaskFilters = {}): Promise<CrmTask[]> {
  let query = getClient().from('crm_tasks').select('*, lead:crm_leads(title)').order('due_at')
  if (filters.leadId) query = query.eq('lead_id', filters.leadId)
  const status = filters.status ?? 'open'
  if (status === 'open') query = query.is('completed_at', null)
  if (status === 'done') query = query.not('completed_at', 'is', null)
  const { data, error } = await query.limit(1000)
  if (error) throw error
  return (data || []).map(mapTask)
}

export async function createTask(dto: CreateCrmTaskDTO): Promise<CrmTask> {
  const { data, error } = await getClient()
    .from('crm_tasks')
    .insert({
      lead_id: dto.leadId ?? null,
      title: dto.title,
      type: dto.type ?? 'follow_up',
      due_at: dto.dueAt,
      responsible: dto.responsible ?? null,
    })
    .select('*, lead:crm_leads(title)')
    .single()
  if (error) throw error
  if (data.lead_id) await addEvent(data.lead_id, 'task_created', `Tarefa criada: ${data.title}`, { taskId: data.id })
  return mapTask(data)
}

export async function updateTask(id: string, dto: UpdateCrmTaskDTO): Promise<CrmTask | null> {
  const supabase = getClient()
  const row: Row = {}
  if (dto.title !== undefined) row.title = dto.title
  if (dto.type !== undefined) row.type = dto.type
  if (dto.dueAt !== undefined) row.due_at = dto.dueAt
  if (dto.responsible !== undefined) row.responsible = dto.responsible
  if (dto.result !== undefined) row.result = dto.result
  if (dto.completed !== undefined) row.completed_at = dto.completed ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from('crm_tasks')
    .update(row)
    .eq('id', id)
    .select('*, lead:crm_leads(title)')
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  if (dto.completed && data.lead_id) {
    const result = data.result ? ` — resultado: ${data.result}` : ''
    await addEvent(data.lead_id, 'task_completed', `Tarefa concluída: ${data.title}${result}`, { taskId: data.id })
  }
  return mapTask(data)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await getClient().from('crm_tasks').delete().eq('id', id)
  if (error) throw error
}

// =============================================================================
// Motivos de perda
// =============================================================================

export async function listLossReasons(): Promise<CrmLossReason[]> {
  const { data, error } = await getClient().from('crm_loss_reasons').select('id, name').order('sort_order')
  if (error) throw error
  return (data || []).map((r: Row) => ({ id: r.id, name: r.name }))
}

export async function createLossReason(name: string): Promise<CrmLossReason> {
  const { data, error } = await getClient().from('crm_loss_reasons').insert({ name, sort_order: 999 }).select('id, name').single()
  if (error) throw error
  return { id: data.id, name: data.name }
}

// =============================================================================
// Integração com Inbox
// =============================================================================

/** Retorna a conversa mais recente do contato do lead (para abrir o chat no Inbox). */
export async function findConversationForContact(contactId: string): Promise<string | null> {
  const { data, error } = await getClient()
    .from('inbox_conversations')
    .select('id')
    .eq('contact_id', contactId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}
