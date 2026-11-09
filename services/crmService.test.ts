import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crmService } from './crmService'
import { createMockFetchResponse, setupFetchMock } from '@/tests/helpers'

describe('crmService', () => {
  const mockFetch = setupFetchMock()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getLeads monta querystring com funil e busca', async () => {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse([]))
    await crmService.getLeads({ pipelineId: 'p1', search: 'moema' })
    expect(mockFetch).toHaveBeenCalledWith('/api/crm/leads?pipelineId=p1&search=moema', { cache: 'no-store' })
  })

  it('updateLead envia PATCH com o DTO', async () => {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({ id: 'l1' }))
    await crmService.updateLead('l1', { stageId: 's2', sortOrder: 1.5 })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/crm/leads/l1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ stageId: 's2', sortOrder: 1.5 })
  })

  it('saveStages envia PUT para o funil', async () => {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse([]))
    await crmService.saveStages('p1', [{ name: 'A', color: '#000000', type: 'open' }])
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/crm/pipelines/p1/stages')
    expect(init.method).toBe('PUT')
  })

  it('propaga mensagem de erro da API', async () => {
    mockFetch.mockResolvedValueOnce(createMockFetchResponse({ error: 'Etapa inválida para este funil' }, { ok: false, status: 400 }))
    await expect(crmService.createLead({ pipelineId: 'p1', title: 'X' })).rejects.toThrow('Etapa inválida para este funil')
  })
})
