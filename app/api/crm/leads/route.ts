/**
 * GET/POST /api/crm/leads - Lista leads (filtro por funil/busca/contato) e cria lead
 */
import { NextRequest, NextResponse } from 'next/server'
import { createLead, listLeads } from '@/lib/crm/crm-db'
import { createLeadSchema } from '@/lib/crm/crm-schemas'
import { crmError, isBusinessError, parseBody } from '@/lib/crm/crm-api'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  try {
    const leads = await listLeads({
      pipelineId: sp.get('pipelineId') || undefined,
      search: sp.get('search') || undefined,
      contactId: sp.get('contactId') || undefined,
    })
    return NextResponse.json(leads)
  } catch (error) {
    return crmError('GET /api/crm/leads', error)
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, createLeadSchema)
  if ('response' in parsed) return parsed.response
  try {
    return NextResponse.json(await createLead(parsed.data), { status: 201 })
  } catch (error) {
    return crmError('POST /api/crm/leads', error, isBusinessError(error) ? 400 : 500)
  }
}
