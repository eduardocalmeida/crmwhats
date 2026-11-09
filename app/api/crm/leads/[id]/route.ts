/**
 * GET/PATCH/DELETE /api/crm/leads/[id] - Detalhe, atualização (inclui mover etapa) e exclusão
 */
import { NextRequest, NextResponse } from 'next/server'
import { deleteLead, getLead, updateLead } from '@/lib/crm/crm-db'
import { updateLeadSchema } from '@/lib/crm/crm-schemas'
import { crmError, isBusinessError, parseBody } from '@/lib/crm/crm-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const lead = await getLead(id)
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    return NextResponse.json(lead)
  } catch (error) {
    return crmError('GET /api/crm/leads/[id]', error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const parsed = await parseBody(request, updateLeadSchema)
  if ('response' in parsed) return parsed.response
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }
  try {
    const lead = await updateLead(id, parsed.data)
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    return NextResponse.json(lead)
  } catch (error) {
    return crmError('PATCH /api/crm/leads/[id]', error, isBusinessError(error) ? 400 : 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    await deleteLead(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return crmError('DELETE /api/crm/leads/[id]', error)
  }
}
