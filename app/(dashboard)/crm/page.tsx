import { CrmClientWrapper } from './CrmClientWrapper'

/**
 * CRM Page (modelo Kommo) — funil de vendas, lista de leads e tarefas.
 * Dados carregados no cliente via React Query (drag & drop exige estado otimista).
 */
export default function CrmPage() {
  return <CrmClientWrapper />
}
