/**
 * GET/POST /api/crm/loss-reasons - Motivos de perda
 */
import { NextRequest, NextResponse } from 'next/server'
import { createLossReason, listLossReasons } from '@/lib/crm/crm-db'
import { lossReasonSchema } from '@/lib/crm/crm-schemas'
import { crmError, parseBody } from '@/lib/crm/crm-api'

export async function GET() {
  try {
    return NextResponse.json(await listLossReasons())
  } catch (error) {
    return crmError('GET /api/crm/loss-reasons', error)
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, lossReasonSchema)
  if ('response' in parsed) return parsed.response
  try {
    return NextResponse.json(await createLossReason(parsed.data.name), { status: 201 })
  } catch (error) {
    return crmError('POST /api/crm/loss-reasons', error, String(error).includes('duplicate') ? 409 : 500)
  }
}
