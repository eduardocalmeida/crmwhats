'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KanbanSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { crmService } from '@/services/crmService'
import { crmKeys } from '@/hooks/useCrm'

interface CrmConversationLeadButtonProps {
  contactId: string | null
  phone: string
  contactName?: string
}

/**
 * Botão no cabeçalho da conversa (Inbox): abre o lead do contato no CRM
 * ou cria um novo lead no funil padrão — como o chat integrado do Kommo.
 */
export function CrmConversationLeadButton({ contactId, phone, contactName }: CrmConversationLeadButtonProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const leadsQuery = useQuery({
    queryKey: ['crm', 'contactLeads', contactId],
    queryFn: () => crmService.getLeads({ contactId: contactId! }),
    enabled: !!contactId,
    staleTime: 30 * 1000,
  })
  const existing = (leadsQuery.data ?? []).find((l) => !l.closedAt) ?? leadsQuery.data?.[0]

  const createMutation = useMutation({
    mutationFn: async () => {
      const pipelines = await queryClient.fetchQuery({ queryKey: crmKeys.pipelines, queryFn: crmService.getPipelines })
      const pipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0]
      if (!pipeline) throw new Error('Nenhum funil configurado no CRM')
      return crmService.createLead({
        pipelineId: pipeline.id,
        title: `Mudança — ${contactName || phone}`,
        contactId: contactId ?? undefined,
        contactPhone: contactId ? undefined : phone,
        contactName,
        source: 'WhatsApp',
      })
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['crm'] })
      toast.success('Lead criado no CRM')
      router.push(`/crm?lead=${encodeURIComponent(lead.id)}`)
    },
    onError: (error: Error) => toast.error(`Erro ao criar lead: ${error.message}`),
  })

  const label = existing ? 'Abrir lead no CRM' : 'Criar lead no CRM'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          disabled={createMutation.isPending || leadsQuery.isLoading}
          onClick={() => (existing ? router.push(`/crm?lead=${encodeURIComponent(existing.id)}`) : createMutation.mutate())}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors disabled:opacity-50"
        >
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KanbanSquare className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
