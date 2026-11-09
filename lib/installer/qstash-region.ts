/**
 * Detecção da região do QStash a partir do token.
 *
 * O Upstash separa o QStash por região (EU / US). Um token só é aceito no
 * endpoint da sua região — nos demais a API responde "user not found in this region".
 * Testamos os endpoints conhecidos e usamos o primeiro que aceitar o token.
 * O endpoint encontrado é salvo como QSTASH_URL, que o SDK (@upstash/qstash e
 * @upstash/workflow) lê automaticamente em runtime.
 */
import { fetchWithTimeout } from './fetch-with-timeout'

export const QSTASH_REGION_ENDPOINTS = [
  'https://qstash-us-east-1.upstash.io',
  'https://qstash-eu-central-1.upstash.io',
  'https://qstash.upstash.io',
] as const

/** Lê o `iss` do JWT quando ele é uma URL (indica o endpoint de origem). */
export function getIssuerBaseUrl(token: string): string | null {
  try {
    const payloadB64 = token.split('.')[1]
    if (!payloadB64) return null
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    if (typeof payload?.iss === 'string' && /^https:\/\/[^/]+\.upstash\.io\/?$/.test(payload.iss)) {
      return payload.iss.replace(/\/$/, '')
    }
  } catch {
    // Token não é JWT decodificável
  }
  return null
}

export type QStashRegionResult =
  | { ok: true; baseUrl: string }
  | { ok: false; reason: 'invalid_token' | 'not_found' | 'network'; detail?: string }

/** Retorna o endpoint da região que aceita o token. */
export async function detectQStashBaseUrl(
  token: string,
  fetchImpl: typeof fetchWithTimeout = fetchWithTimeout
): Promise<QStashRegionResult> {
  const issuer = getIssuerBaseUrl(token)
  const candidates = [...new Set([...(issuer ? [issuer] : []), ...QSTASH_REGION_ENDPOINTS])]

  let unauthorized = 0
  let lastDetail: string | undefined
  let reachedAny = false

  for (const baseUrl of candidates) {
    try {
      const res = await fetchImpl(`${baseUrl}/v2/schedules`, { headers: { Authorization: `Bearer ${token}` } }, 10_000)
      reachedAny = true
      if (res.ok) return { ok: true, baseUrl }
      if (res.status === 401 || res.status === 403) unauthorized++
      lastDetail = await res.text().catch(() => res.statusText)
    } catch (error) {
      lastDetail = error instanceof Error ? error.message : String(error)
    }
  }

  if (!reachedAny) return { ok: false, reason: 'network', detail: lastDetail }
  if (unauthorized > 0) return { ok: false, reason: 'invalid_token', detail: lastDetail }
  return { ok: false, reason: 'not_found', detail: lastDetail }
}

export function describeQStashError(result: Exclude<QStashRegionResult, { ok: true }>): string {
  if (result.reason === 'network') return 'Não foi possível conectar ao QStash. Tente novamente.'
  return 'Token QStash inválido. Copie o QSTASH_TOKEN do console Upstash → QStash (sem aspas, com "Read-Only Token" desmarcado).'
}
