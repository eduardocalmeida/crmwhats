import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => null }))

import { leadDtoToRow, mapLead } from './crm-db'

describe('crm-db mappers', () => {
  it('leadDtoToRow converte apenas campos presentes', () => {
    expect(leadDtoToRow({ title: 'A', movingDate: '2026-12-01', volumeM3: null, needsPacking: true })).toEqual({
      title: 'A',
      moving_date: '2026-12-01',
      volume_m3: null,
      needs_packing: true,
    })
    expect(leadDtoToRow({})).toEqual({})
  })

  it('mapLead normaliza números e contato', () => {
    const lead = mapLead({
      id: 'l1',
      pipeline_id: 'p1',
      stage_id: 's1',
      title: 'Mudança',
      contact_id: 'ct_1',
      contact: { id: 'ct_1', name: 'Ana', phone: '+5511999999999' },
      value: '3500.00',
      volume_m3: '12.5',
      tags: null,
      sort_order: 2,
      stage_changed_at: 'x',
      created_at: 'x',
      updated_at: 'x',
    })
    expect(lead.value).toBe(3500)
    expect(lead.volumeM3).toBe(12.5)
    expect(lead.tags).toEqual([])
    expect(lead.contact?.name).toBe('Ana')
    expect(lead.needsPacking).toBe(false)
  })
})
