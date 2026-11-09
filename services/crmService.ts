import type {
  CreateCrmLeadDTO,
  CreateCrmTaskDTO,
  CrmLead,
  CrmLeadEvent,
  CrmLossReason,
  CrmPipeline,
  CrmStage,
  CrmTask,
  UpdateCrmLeadDTO,
  UpdateCrmTaskDTO,
  UpsertCrmStageDTO,
} from '../types'
import { api } from '../lib/api'

const enc = encodeURIComponent

/**
 * CRM Service (modelo Kommo)
 * Funis, leads, tarefas e timeline via API routes do Next.js
 */
export const crmService = {
  // Funis
  getPipelines: (): Promise<CrmPipeline[]> => api.get<CrmPipeline[]>('/api/crm/pipelines', { cache: 'no-store' }),
  createPipeline: (name: string): Promise<CrmPipeline> => api.post<CrmPipeline>('/api/crm/pipelines', { name }),
  renamePipeline: (id: string, name: string): Promise<void> => api.patch(`/api/crm/pipelines/${enc(id)}`, { name }),
  deletePipeline: (id: string): Promise<void> => api.del(`/api/crm/pipelines/${enc(id)}`),
  saveStages: (pipelineId: string, stages: UpsertCrmStageDTO[]): Promise<CrmStage[]> =>
    api.put<CrmStage[]>(`/api/crm/pipelines/${enc(pipelineId)}/stages`, { stages }),

  // Leads
  getLeads: (params: { pipelineId?: string; search?: string; contactId?: string } = {}): Promise<CrmLead[]> => {
    const qs = new URLSearchParams()
    if (params.pipelineId) qs.set('pipelineId', params.pipelineId)
    if (params.search) qs.set('search', params.search)
    if (params.contactId) qs.set('contactId', params.contactId)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<CrmLead[]>(`/api/crm/leads${suffix}`, { cache: 'no-store' })
  },
  getLead: (id: string): Promise<CrmLead> => api.get<CrmLead>(`/api/crm/leads/${enc(id)}`, { cache: 'no-store' }),
  createLead: (dto: CreateCrmLeadDTO): Promise<CrmLead> => api.post<CrmLead>('/api/crm/leads', dto),
  updateLead: (id: string, dto: UpdateCrmLeadDTO): Promise<CrmLead> => api.patch<CrmLead>(`/api/crm/leads/${enc(id)}`, dto),
  deleteLead: (id: string): Promise<void> => api.del(`/api/crm/leads/${enc(id)}`),
  getLeadConversation: (id: string): Promise<{ conversationId: string | null }> =>
    api.get(`/api/crm/leads/${enc(id)}/conversation`, { cache: 'no-store' }),

  // Timeline
  getLeadEvents: (leadId: string): Promise<CrmLeadEvent[]> =>
    api.get<CrmLeadEvent[]>(`/api/crm/leads/${enc(leadId)}/events`, { cache: 'no-store' }),
  addNote: (leadId: string, content: string): Promise<CrmLeadEvent> =>
    api.post<CrmLeadEvent>(`/api/crm/leads/${enc(leadId)}/events`, { content }),

  // Tarefas
  getTasks: (params: { leadId?: string; status?: 'open' | 'done' | 'all' } = {}): Promise<CrmTask[]> => {
    const qs = new URLSearchParams()
    if (params.leadId) qs.set('leadId', params.leadId)
    if (params.status) qs.set('status', params.status)
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get<CrmTask[]>(`/api/crm/tasks${suffix}`, { cache: 'no-store' })
  },
  createTask: (dto: CreateCrmTaskDTO): Promise<CrmTask> => api.post<CrmTask>('/api/crm/tasks', dto),
  updateTask: (id: string, dto: UpdateCrmTaskDTO): Promise<CrmTask> => api.patch<CrmTask>(`/api/crm/tasks/${enc(id)}`, dto),
  deleteTask: (id: string): Promise<void> => api.del(`/api/crm/tasks/${enc(id)}`),

  // Motivos de perda
  getLossReasons: (): Promise<CrmLossReason[]> => api.get<CrmLossReason[]>('/api/crm/loss-reasons', { cache: 'no-store' }),
}
