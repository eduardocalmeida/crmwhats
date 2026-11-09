/**
 * PUT /api/crm/pipelines/[id]/stages - Substitui as etapas do funil (ordem = ordem do array)
 */
import { NextRequest, NextResponse } from 'next/server'
import { replaceStages } from '@/lib/crm/crm-db'
import { stagesSchema } from '@/lib/crm/crm-schemas'
import { crmError, isBusinessError, parseBody } from '@/lib/crm/crm-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const parsed = await parseBody(request, stagesSchema)
  if ('response' in parsed) return parsed.response
  try {
    return NextResponse.json(await replaceStages(id, parsed.data.stages))
  } catch (error) {
    return crmError('PUT /api/crm/pipelines/[id]/stages', error, isBusinessError(error) ? 409 : 500)
  }
}
