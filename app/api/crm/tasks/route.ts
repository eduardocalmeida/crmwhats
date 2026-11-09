/**
 * GET/POST /api/crm/tasks - Lista tarefas (filtro por lead/status) e cria tarefa
 */
import { NextRequest, NextResponse } from 'next/server'
import { createTask, listTasks } from '@/lib/crm/crm-db'
import { createTaskSchema } from '@/lib/crm/crm-schemas'
import { crmError, parseBody } from '@/lib/crm/crm-api'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const status = sp.get('status')
  try {
    const tasks = await listTasks({
      leadId: sp.get('leadId') || undefined,
      status: status === 'done' || status === 'all' ? status : 'open',
    })
    return NextResponse.json(tasks)
  } catch (error) {
    return crmError('GET /api/crm/tasks', error)
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, createTaskSchema)
  if ('response' in parsed) return parsed.response
  try {
    return NextResponse.json(await createTask(parsed.data), { status: 201 })
  } catch (error) {
    return crmError('POST /api/crm/tasks', error)
  }
}
