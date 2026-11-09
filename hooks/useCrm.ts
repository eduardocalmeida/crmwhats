'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CreateCrmLeadDTO,
  CreateCrmTaskDTO,
  CrmLead,
  CrmPipeline,
  UpdateCrmLeadDTO,
  UpdateCrmTaskDTO,
  UpsertCrmStageDTO,
} from '@/types'
import { crmService } from '@/services/crmService'
import { computeSortOrder, summarizeLeads } from '@/lib/crm/crm-utils'

export type CrmViewMode = 'kanban' | 'list' | 'tasks'

const PIPELINE_STORAGE_KEY = 'crm:selectedPipeline'

export const crmKeys = {
  all: ['crm'] as const,
  pipelines: ['crm', 'pipelines'] as const,
  leads: (pipelineId: string | null, search: string) => ['crm', 'leads', pipelineId, search] as const,
  lead: (id: string) => ['crm', 'lead', id] as const,
  events: (leadId: string) => ['crm', 'events', leadId] as const,
  tasks: (filter: { leadId?: string; status?: string }) => ['crm', 'tasks', filter] as const,
  lossReasons: ['crm', 'lossReasons'] as const,
}

const errorToast = (prefix: string) => (error: Error) => toast.error(`${prefix}: ${error.message}`)

// =============================================================================
// Controller principal (página /crm)
// =============================================================================

export const useCrmController = () => {
  const queryClient = useQueryClient()

  const [view, setView] = useState<CrmViewMode>('kanban')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false)
  const [isPipelineSettingsOpen, setIsPipelineSettingsOpen] = useState(false)
  const [pendingLost, setPendingLost] = useState<{ leadId: string; stageId: string; sortOrder: number } | null>(null)

  const [pipelineId, setPipelineIdState] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(PIPELINE_STORAGE_KEY) : null
    } catch {
      return null
    }
  })
  const setPipelineId = (id: string) => {
    setPipelineIdState(id)
    try {
      window.localStorage.setItem(PIPELINE_STORAGE_KEY, id)
    } catch {
      /* armazenamento indisponível */
    }
  }

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Abre lead via ?lead=<id> (links do Inbox / tarefas)
  useEffect(() => {
    const leadParam = new URLSearchParams(window.location.search).get('lead')
    if (leadParam) setSelectedLeadId(leadParam)
  }, [])

  const pipelinesQuery = useQuery({ queryKey: crmKeys.pipelines, queryFn: crmService.getPipelines })
  const pipelines = useMemo(() => pipelinesQuery.data ?? [], [pipelinesQuery.data])

  const activePipeline: CrmPipeline | null = useMemo(() => {
    if (pipelines.length === 0) return null
    return pipelines.find((p) => p.id === pipelineId) ?? pipelines.find((p) => p.isDefault) ?? pipelines[0]
  }, [pipelines, pipelineId])

  const leadsKey = crmKeys.leads(activePipeline?.id ?? null, search)
  const leadsQuery = useQuery({
    queryKey: leadsKey,
    queryFn: () => crmService.getLeads({ pipelineId: activePipeline!.id, search: search || undefined }),
    enabled: !!activePipeline,
  })
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data])

  const lossReasonsQuery = useQuery({ queryKey: crmKeys.lossReasons, queryFn: crmService.getLossReasons, staleTime: 5 * 60 * 1000 })

  const tasksQuery = useQuery({
    queryKey: crmKeys.tasks({ status: 'open' }),
    queryFn: () => crmService.getTasks({ status: 'open' }),
  })

  // Leads agrupados por etapa (ordenados por sort_order)
  const leadsByStage = useMemo(() => {
    const map: Record<string, CrmLead[]> = {}
    for (const stage of activePipeline?.stages ?? []) map[stage.id] = []
    for (const lead of leads) (map[lead.stageId] ??= []).push(lead)
    for (const list of Object.values(map)) list.sort((a, b) => a.sortOrder - b.sortOrder)
    return map
  }, [leads, activePipeline])

  // Estatísticas do funil
  const stats = useMemo(() => {
    const stages = activePipeline?.stages ?? []
    const openIds = new Set(stages.filter((s) => s.type === 'open').map((s) => s.id))
    const wonIds = new Set(stages.filter((s) => s.type === 'won').map((s) => s.id))
    const lostIds = new Set(stages.filter((s) => s.type === 'lost').map((s) => s.id))
    const open = summarizeLeads(leads.filter((l) => openIds.has(l.stageId)))
    const won = summarizeLeads(leads.filter((l) => wonIds.has(l.stageId)))
    const lost = summarizeLeads(leads.filter((l) => lostIds.has(l.stageId)))
    const closed = won.count + lost.count
    return {
      open,
      won,
      lost,
      conversionRate: closed > 0 ? Math.round((won.count / closed) * 100) : 0,
      overdueTasks: (tasksQuery.data ?? []).filter((t) => new Date(t.dueAt).getTime() < Date.now()).length,
    }
  }, [leads, activePipeline, tasksQuery.data])

  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })

  // Mover lead (drag & drop) com update otimista
  const moveMutation = useMutation({
    mutationFn: (vars: { leadId: string; stageId: string; sortOrder: number; lossReason?: string | null }) =>
      crmService.updateLead(vars.leadId, { stageId: vars.stageId, sortOrder: vars.sortOrder, lossReason: vars.lossReason }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: leadsKey })
      const previous = queryClient.getQueryData<CrmLead[]>(leadsKey)
      queryClient.setQueryData<CrmLead[]>(leadsKey, (old) =>
        (old ?? []).map((l) => (l.id === vars.leadId ? { ...l, stageId: vars.stageId, sortOrder: vars.sortOrder } : l))
      )
      return { previous }
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(leadsKey, ctx.previous)
      toast.error(`Não foi possível mover o lead: ${error.message}`)
    },
    onSettled: (_data, _err, vars) => {
      invalidateLeads()
      queryClient.invalidateQueries({ queryKey: crmKeys.lead(vars.leadId) })
      queryClient.invalidateQueries({ queryKey: crmKeys.events(vars.leadId) })
    },
  })

  /**
   * Move um lead para uma etapa, na posição `index` da coluna.
   * Etapa "Perdido" abre o diálogo de motivo de perda antes de salvar.
   */
  const moveLead = (leadId: string, stageId: string, index: number) => {
    const column = (leadsByStage[stageId] ?? []).filter((l) => l.id !== leadId)
    const before = column[index - 1]?.sortOrder
    const after = column[index]?.sortOrder
    const sortOrder = computeSortOrder(before, after)
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    if (lead.stageId === stageId && lead.sortOrder === sortOrder) return

    const stage = activePipeline?.stages.find((s) => s.id === stageId)
    if (stage?.type === 'lost' && lead.stageId !== stageId) {
      setPendingLost({ leadId, stageId, sortOrder })
      return
    }
    moveMutation.mutate({ leadId, stageId, sortOrder })
  }

  const confirmLost = (lossReason: string | null) => {
    if (!pendingLost) return
    moveMutation.mutate({ ...pendingLost, lossReason })
    setPendingLost(null)
  }

  const createLeadMutation = useMutation({
    mutationFn: (dto: CreateCrmLeadDTO) => crmService.createLead(dto),
    onSuccess: (lead) => {
      invalidateLeads()
      toast.success('Lead criado')
      setIsNewLeadOpen(false)
      return lead
    },
    onError: errorToast('Erro ao criar lead'),
  })

  const createPipelineMutation = useMutation({
    mutationFn: (name: string) => crmService.createPipeline(name),
    onSuccess: async (pipeline) => {
      await queryClient.invalidateQueries({ queryKey: crmKeys.pipelines })
      setPipelineId(pipeline.id)
      toast.success('Funil criado')
    },
    onError: errorToast('Erro ao criar funil'),
  })

  const savePipelineMutation = useMutation({
    mutationFn: async (vars: { pipelineId: string; name: string; stages: UpsertCrmStageDTO[] }) => {
      await crmService.renamePipeline(vars.pipelineId, vars.name)
      await crmService.saveStages(vars.pipelineId, vars.stages)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: crmKeys.pipelines })
      toast.success('Funil atualizado')
      setIsPipelineSettingsOpen(false)
    },
    onError: errorToast('Erro ao salvar funil'),
  })

  const deletePipelineMutation = useMutation({
    mutationFn: (id: string) => crmService.deletePipeline(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: crmKeys.pipelines })
      setIsPipelineSettingsOpen(false)
      toast.success('Funil excluído')
    },
    onError: errorToast('Erro ao excluir funil'),
  })

  return {
    // dados
    pipelines,
    activePipeline,
    leads,
    leadsByStage,
    stats,
    tasks: tasksQuery.data ?? [],
    lossReasons: lossReasonsQuery.data ?? [],
    isLoading: pipelinesQuery.isLoading || (!!activePipeline && leadsQuery.isLoading),
    error: (pipelinesQuery.error || leadsQuery.error)?.message,

    // UI state
    view,
    setView,
    searchInput,
    setSearchInput,
    setPipelineId,
    selectedLeadId,
    setSelectedLeadId,
    isNewLeadOpen,
    setIsNewLeadOpen,
    isPipelineSettingsOpen,
    setIsPipelineSettingsOpen,
    pendingLost,
    cancelLost: () => setPendingLost(null),
    confirmLost,

    // ações
    moveLead,
    createLead: (dto: CreateCrmLeadDTO) => createLeadMutation.mutateAsync(dto),
    isCreatingLead: createLeadMutation.isPending,
    createPipeline: (name: string) => createPipelineMutation.mutate(name),
    savePipeline: (vars: { pipelineId: string; name: string; stages: UpsertCrmStageDTO[] }) => savePipelineMutation.mutate(vars),
    isSavingPipeline: savePipelineMutation.isPending,
    deletePipeline: (id: string) => deletePipelineMutation.mutate(id),
  }
}

export type CrmController = ReturnType<typeof useCrmController>

// =============================================================================
// Detalhe do lead (card lateral)
// =============================================================================

export const useCrmLeadDetail = (leadId: string | null) => {
  const queryClient = useQueryClient()
  const enabled = !!leadId

  const leadQuery = useQuery({
    queryKey: crmKeys.lead(leadId ?? ''),
    queryFn: () => crmService.getLead(leadId!),
    enabled,
  })
  const eventsQuery = useQuery({
    queryKey: crmKeys.events(leadId ?? ''),
    queryFn: () => crmService.getLeadEvents(leadId!),
    enabled,
  })
  const tasksQuery = useQuery({
    queryKey: crmKeys.tasks({ leadId: leadId ?? '', status: 'all' }),
    queryFn: () => crmService.getTasks({ leadId: leadId!, status: 'all' }),
    enabled,
  })

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })
    queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] })
    if (leadId) {
      queryClient.invalidateQueries({ queryKey: crmKeys.lead(leadId) })
      queryClient.invalidateQueries({ queryKey: crmKeys.events(leadId) })
    }
  }

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateCrmLeadDTO) => crmService.updateLead(leadId!, dto),
    onSuccess: (lead) => {
      queryClient.setQueryData(crmKeys.lead(lead.id), lead)
      refreshAll()
      toast.success('Lead atualizado')
    },
    onError: errorToast('Erro ao salvar lead'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => crmService.deleteLead(leadId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] })
      toast.success('Lead excluído')
    },
    onError: errorToast('Erro ao excluir lead'),
  })

  const noteMutation = useMutation({
    mutationFn: (content: string) => crmService.addNote(leadId!, content),
    onSuccess: () => leadId && queryClient.invalidateQueries({ queryKey: crmKeys.events(leadId) }),
    onError: errorToast('Erro ao salvar nota'),
  })

  const createTaskMutation = useMutation({
    mutationFn: (dto: CreateCrmTaskDTO) => crmService.createTask({ ...dto, leadId }),
    onSuccess: () => {
      refreshAll()
      toast.success('Tarefa criada')
    },
    onError: errorToast('Erro ao criar tarefa'),
  })

  const updateTaskMutation = useMutation({
    mutationFn: (vars: { id: string; dto: UpdateCrmTaskDTO }) => crmService.updateTask(vars.id, vars.dto),
    onSuccess: refreshAll,
    onError: errorToast('Erro ao atualizar tarefa'),
  })

  const openChatMutation = useMutation({
    mutationFn: () => crmService.getLeadConversation(leadId!),
  })

  return {
    lead: leadQuery.data ?? null,
    isLoading: leadQuery.isLoading,
    events: eventsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    updateLead: (dto: UpdateCrmLeadDTO) => updateMutation.mutateAsync(dto),
    isSaving: updateMutation.isPending,
    deleteLead: () => deleteMutation.mutateAsync(),
    addNote: (content: string) => noteMutation.mutateAsync(content),
    isAddingNote: noteMutation.isPending,
    createTask: (dto: CreateCrmTaskDTO) => createTaskMutation.mutateAsync(dto),
    isCreatingTask: createTaskMutation.isPending,
    updateTask: (id: string, dto: UpdateCrmTaskDTO) => updateTaskMutation.mutate({ id, dto }),
    findConversation: () => openChatMutation.mutateAsync(),
  }
}

// =============================================================================
// Tarefas (aba Tarefas)
// =============================================================================

export const useCrmTasksController = (status: 'open' | 'done') => {
  const queryClient = useQueryClient()
  const tasksQuery = useQuery({
    queryKey: crmKeys.tasks({ status }),
    queryFn: () => crmService.getTasks({ status }),
  })

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; dto: UpdateCrmTaskDTO }) => crmService.updateTask(vars.id, vars.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'events'] })
    },
    onError: errorToast('Erro ao atualizar tarefa'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })
    },
    onError: errorToast('Erro ao excluir tarefa'),
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateCrmTaskDTO) => crmService.createTask(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'tasks'] })
      toast.success('Tarefa criada')
    },
    onError: errorToast('Erro ao criar tarefa'),
  })

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    completeTask: (id: string, result?: string) => updateMutation.mutate({ id, dto: { completed: true, result: result || null } }),
    reopenTask: (id: string) => updateMutation.mutate({ id, dto: { completed: false } }),
    deleteTask: (id: string) => deleteMutation.mutate(id),
    createTask: (dto: CreateCrmTaskDTO) => createMutation.mutateAsync(dto),
  }
}
