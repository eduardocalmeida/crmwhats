/**
 * PATCH/DELETE /api/crm/tasks/[id] - Atualiza (inclui concluir) e exclui tarefa
 */
import { NextRequest, NextResponse } from 'next/server'
import { deleteTask, updateTask } from '@/lib/crm/crm-db'
import { updateTaskSchema } from '@/lib/crm/crm-schemas'
import { crmError, parseBody } from '@/lib/crm/crm-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const parsed = await parseBody(request, updateTaskSchema)
  if ('response' in parsed) return parsed.response
  try {
    const task = await updateTask(id, parsed.data)
    if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    return NextResponse.json(task)
  } catch (error) {
    return crmError('PATCH /api/crm/tasks/[id]', error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    await deleteTask(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return crmError('DELETE /api/crm/tasks/[id]', error)
  }
}
