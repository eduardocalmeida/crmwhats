/**
 * Helpers de resposta para as API routes do CRM
 */
import { NextResponse } from 'next/server'
import type { ZodType } from 'zod'

export function crmError(scope: string, error: unknown, status = 500) {
  console.error(`[${scope}]`, error)
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Internal server error'
  return NextResponse.json({ error: message }, { status })
}

/** Lê e valida o body JSON. Retorna dados ou uma NextResponse 400. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<{ data: T } | { response: NextResponse }> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { response: NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      response: NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 }),
    }
  }
  return { data: parsed.data }
}

/** Erros de regra de negócio (mensagens em pt-BR lançadas pelo crm-db) viram 400/409. */
export function isBusinessError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /^(Não é possível|O funil precisa|Mova os leads|Etapa|Funil sem|Telefone inválido)/.test(error.message)
}
