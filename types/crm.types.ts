/**
 * CRM Domain Types (modelo Kommo — Mude Bem)
 */

export type CrmStageType = 'open' | 'won' | 'lost'

export interface CrmStage {
  id: string
  pipelineId: string
  name: string
  color: string
  sortOrder: number
  type: CrmStageType
}

export interface CrmPipeline {
  id: string
  name: string
  isDefault: boolean
  sortOrder: number
  stages: CrmStage[]
}

export type CrmServiceType = 'residencial' | 'comercial' | 'interestadual' | 'guarda_moveis' | 'carreto'

export interface CrmLeadContact {
  id: string
  name: string
  phone: string
  email?: string | null
}

export interface CrmLead {
  id: string
  pipelineId: string
  stageId: string
  title: string
  contactId: string | null
  contact?: CrmLeadContact | null
  value: number
  responsible: string | null
  source: string | null
  tags: string[]
  lossReason: string | null
  serviceType: CrmServiceType | null
  propertyType: string | null
  originAddress: string | null
  destinationAddress: string | null
  movingDate: string | null
  volumeM3: number | null
  needsPacking: boolean
  needsStorage: boolean
  customFields: Record<string, unknown>
  sortOrder: number
  stageChangedAt: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
  /** Próxima tarefa aberta (para indicador no card, como no Kommo) */
  nextTask?: { id: string; title: string; dueAt: string } | null
}

export interface CreateCrmLeadDTO {
  pipelineId: string
  stageId?: string
  title: string
  contactId?: string | null
  /** Cria/vincula contato pelo telefone quando contactId não é informado */
  contactName?: string
  contactPhone?: string
  value?: number
  responsible?: string | null
  source?: string | null
  tags?: string[]
  serviceType?: CrmServiceType | null
  propertyType?: string | null
  originAddress?: string | null
  destinationAddress?: string | null
  movingDate?: string | null
  volumeM3?: number | null
  needsPacking?: boolean
  needsStorage?: boolean
}

export type UpdateCrmLeadDTO = Partial<Omit<CreateCrmLeadDTO, 'contactName' | 'contactPhone'>> & {
  lossReason?: string | null
  sortOrder?: number
}

export type CrmTaskType = 'call' | 'meeting' | 'visit' | 'follow_up' | 'email' | 'other'

export interface CrmTask {
  id: string
  leadId: string | null
  leadTitle?: string | null
  title: string
  type: CrmTaskType
  dueAt: string
  responsible: string | null
  completedAt: string | null
  result: string | null
  createdAt: string
}

export interface CreateCrmTaskDTO {
  leadId?: string | null
  title: string
  type?: CrmTaskType
  dueAt: string
  responsible?: string | null
}

export interface UpdateCrmTaskDTO {
  title?: string
  type?: CrmTaskType
  dueAt?: string
  responsible?: string | null
  completed?: boolean
  result?: string | null
}

export type CrmLeadEventType = 'note' | 'created' | 'stage_change' | 'task_created' | 'task_completed' | 'updated'

export interface CrmLeadEvent {
  id: string
  leadId: string
  type: CrmLeadEventType
  content: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface CrmLossReason {
  id: string
  name: string
}

export interface UpsertCrmStageDTO {
  id?: string
  name: string
  color: string
  type: CrmStageType
}
