/**
 * GET /api/crm/leads/[id]/conversation - Conversa do Inbox vinculada ao contato do lead
 */
import { NextRequest, NextResponse } from 'next/server'
import { findConversationForContact, getLead } from '@/lib/crm/crm-db'
import { crmError } from '@/lib/crm/crm-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const lead = await getLead(id)
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    const conversationId = lead.contactId ? await findConversationForContact(lead.contactId) : null
    return NextResponse.json({ conversationId })
  } catch (error) {
    return crmError('GET /api/crm/leads/[id]/conversation', error)
  }
}
