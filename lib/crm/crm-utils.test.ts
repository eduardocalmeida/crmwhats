import { describe, expect, it } from 'vitest'
import { computeSortOrder, daysSince, formatDate, getTaskBucket, groupTasks, summarizeLeads } from './crm-utils'
import type { CrmTask } from '@/types'

describe('crm-utils', () => {
  it('computeSortOrder insere entre vizinhos', () => {
    expect(computeSortOrder(1, 2)).toBe(1.5)
    expect(computeSortOrder(undefined, 5)).toBe(4)
    expect(computeSortOrder(5, undefined)).toBe(6)
    expect(computeSortOrder()).toBe(0)
  })

  it('summarizeLeads soma valores', () => {
    expect(summarizeLeads([{ value: 1000 }, { value: 2500.5 }])).toEqual({ count: 2, total: 3500.5 })
    expect(summarizeLeads([])).toEqual({ count: 0, total: 0 })
  })

  it('getTaskBucket classifica por prazo', () => {
    const now = new Date(2026, 10, 9, 12, 0)
    expect(getTaskBucket(new Date(2026, 10, 9, 10, 0).toISOString(), now)).toBe('overdue')
    expect(getTaskBucket(new Date(2026, 10, 9, 18, 0).toISOString(), now)).toBe('today')
    expect(getTaskBucket(new Date(2026, 10, 10, 9, 0).toISOString(), now)).toBe('tomorrow')
    expect(getTaskBucket(new Date(2026, 10, 14, 9, 0).toISOString(), now)).toBe('week')
    expect(getTaskBucket(new Date(2026, 11, 20, 9, 0).toISOString(), now)).toBe('later')
  })

  it('groupTasks agrupa por bucket', () => {
    const now = new Date(2026, 10, 9, 12, 0)
    const base = { leadId: null, title: 't', type: 'call', responsible: null, completedAt: null, result: null, createdAt: '' } as const
    const tasks: CrmTask[] = [
      { ...base, id: '1', dueAt: new Date(2026, 10, 8).toISOString() },
      { ...base, id: '2', dueAt: new Date(2026, 10, 10, 9).toISOString() },
    ]
    const groups = groupTasks(tasks, now)
    expect(groups.overdue.map((t) => t.id)).toEqual(['1'])
    expect(groups.tomorrow.map((t) => t.id)).toEqual(['2'])
  })

  it('daysSince e formatDate', () => {
    const now = new Date('2026-11-09T12:00:00Z')
    expect(daysSince('2026-11-06T12:00:00Z', now)).toBe(3)
    expect(formatDate('2026-12-01')).toBe('01/12/2026')
  })
})
