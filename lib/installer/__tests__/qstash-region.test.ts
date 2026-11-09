import { describe, expect, it, vi } from 'vitest'
import { detectQStashBaseUrl, getIssuerBaseUrl } from '../qstash-region'

const jwt = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`
const resp = (status: number, body = '') => ({ ok: status < 300, status, statusText: '', text: async () => body }) as Response

describe('qstash-region', () => {
  it('getIssuerBaseUrl só aceita URLs do upstash', () => {
    expect(getIssuerBaseUrl(jwt({ iss: 'https://qstash-eu-central-1.upstash.io/' }))).toBe('https://qstash-eu-central-1.upstash.io')
    expect(getIssuerBaseUrl(jwt({ iss: 'upstash' }))).toBeNull()
    expect(getIssuerBaseUrl('qstash_abc')).toBeNull()
  })

  it('encontra a região US quando EU recusa', async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.startsWith('https://qstash-us-east-1') ? resp(200) : resp(404, 'not found in this region')))
    const result = await detectQStashBaseUrl('tok', fetchImpl as never)
    expect(result).toEqual({ ok: true, baseUrl: 'https://qstash-us-east-1.upstash.io' })
  })

  it('encontra a região EU quando US recusa', async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.startsWith('https://qstash-eu-central-1') ? resp(200) : resp(404, 'user not found in this region (us-east-1)')))
    const result = await detectQStashBaseUrl('tok', fetchImpl as never)
    expect(result).toEqual({ ok: true, baseUrl: 'https://qstash-eu-central-1.upstash.io' })
  })

  it('reporta token inválido quando todas recusam com 401', async () => {
    const result = await detectQStashBaseUrl('tok', (async () => resp(401)) as never)
    expect(result).toMatchObject({ ok: false, reason: 'invalid_token' })
  })

  it('reporta erro de rede quando nenhuma responde', async () => {
    const result = await detectQStashBaseUrl('tok', (async () => { throw new Error('ECONNRESET') }) as never)
    expect(result).toMatchObject({ ok: false, reason: 'network' })
  })
})
