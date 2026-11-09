/**
 * Schemas Zod do CRM (validação das API routes)
 */
import { z } from 'zod'

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional()

export const serviceTypeSchema = z.enum(['residencial', 'comercial', 'interestadual', 'guarda_moveis', 'carreto'])
export const stageTypeSchema = z.enum(['open', 'won', 'lost'])
export const taskTypeSchema = z.enum(['call', 'meeting', 'visit', 'follow_up', 'email', 'other'])

const leadFields = {
  title: z.string().trim().min(1).max(200),
  contactId: z.string().max(100).nullable().optional(),
  value: z.number().min(0).max(1e12).optional(),
  responsible: nullableText(100),
  source: nullableText(100),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  serviceType: serviceTypeSchema.nullable().optional(),
  propertyType: nullableText(100),
  originAddress: nullableText(500),
  destinationAddress: nullableText(500),
  movingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  volumeM3: z.number().min(0).max(100000).nullable().optional(),
  needsPacking: z.boolean().optional(),
  needsStorage: z.boolean().optional(),
}

export const createLeadSchema = z.object({
  ...leadFields,
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid().optional(),
  contactName: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(30).optional(),
})

export const updateLeadSchema = z.object({
  ...leadFields,
  title: leadFields.title.optional(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  lossReason: nullableText(200),
  sortOrder: z.number().optional(),
})

export const pipelineNameSchema = z.object({ name: z.string().trim().min(1).max(100) })

export const stagesSchema = z.object({
  stages: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(60),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        type: stageTypeSchema,
      })
    )
    .min(3)
    .max(30),
})

export const noteSchema = z.object({ content: z.string().trim().min(1).max(10000) })

export const createTaskSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(300),
  type: taskTypeSchema.optional(),
  dueAt: z.string().datetime({ offset: true }),
  responsible: nullableText(100),
})

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  type: taskTypeSchema.optional(),
  dueAt: z.string().datetime({ offset: true }).optional(),
  responsible: nullableText(100),
  completed: z.boolean().optional(),
  result: nullableText(2000),
})

export const lossReasonSchema = z.object({ name: z.string().trim().min(1).max(100) })
