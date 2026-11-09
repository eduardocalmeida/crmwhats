/**
 * GET/POST /api/crm/leads/[id]/events - Timeline do lead e criação de nota
 */
import { NextRequest, NextResponse } from 'next/server'
import { addLeadNote, listLeadEvents } from '@/lib/crm/crm-db'
import { noteSchema } from '@/lib/crm/crm-schemas'
import { crmError, parseBody } from '@/lib/crm/crm-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    return NextResponse.json(await listLeadEvents(id))
  } catch (error) {
    return crmError('GET /api/crm/leads/[id]/events', error)
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const parsed = await parseBody(request, noteSchema)
  if ('response' in parsed) return parsed.response
  try {
    return NextResponse.json(await addLeadNote(id, parsed.data.content), { status: 201 })
  } catch (error) {
    return crmError('POST /api/crm/leads/[id]/events', error)
  }
}
