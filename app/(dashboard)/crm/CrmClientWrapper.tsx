'use client'

import { useCrmController } from '@/hooks/useCrm'
import { CrmView } from '@/components/features/crm/CrmView'

export function CrmClientWrapper() {
  const controller = useCrmController()
  return <CrmView controller={controller} />
}
