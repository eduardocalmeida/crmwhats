/**
 * GET/POST /api/crm/pipelines - Lista funis (com etapas) e cria funil
 */
import { NextRequest, NextResponse } from 'next/server'
import { createPipeline, listPipelines } from '@/lib/crm/crm-db'
import { pipelineNameSchema } from '@/lib/crm/crm-schemas'
import { crmError, parseBody } from '@/lib/crm/crm-api'

export async function GET() {
  try {
    return NextResponse.json(await listPipelines())
  } catch (error) {
    return crmError('GET /api/crm/pipelines', error)
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, pipelineNameSchema)
  if ('response' in parsed) return parsed.response
  try {
    return NextResponse.json(await createPipeline(parsed.data.name), { status: 201 })
  } catch (error) {
    return crmError('POST /api/crm/pipelines', error)
  }
}
