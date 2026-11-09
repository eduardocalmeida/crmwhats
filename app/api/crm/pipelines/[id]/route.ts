/**
 * PATCH/DELETE /api/crm/pipelines/[id] - Renomeia ou exclui funil
 */
import { NextRequest, NextResponse } from 'next/server'
import { deletePipeline, renamePipeline } from '@/lib/crm/crm-db'
import { pipelineNameSchema } from '@/lib/crm/crm-schemas'
import { crmError, isBusinessError, parseBody } from '@/lib/crm/crm-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const parsed = await parseBody(request, pipelineNameSchema)
  if ('response' in parsed) return parsed.response
  try {
    await renamePipeline(id, parsed.data.name)
    return NextResponse.json({ success: true })
  } catch (error) {
    return crmError('PATCH /api/crm/pipelines/[id]', error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    await deletePipeline(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return crmError('DELETE /api/crm/pipelines/[id]', error, isBusinessError(error) ? 409 : 500)
  }
}
