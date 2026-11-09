'use client'

import { useState } from 'react'
import type { CreateCrmLeadDTO, CrmPipeline, CrmServiceType } from '@/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LEAD_SOURCES, PROPERTY_TYPES, SERVICE_TYPE_LABELS } from '@/lib/crm/crm-utils'
import { Field, fieldCls, SelectField } from './crm-form'

interface CrmNewLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pipeline: CrmPipeline
  onCreate: (dto: CreateCrmLeadDTO) => Promise<unknown>
  isCreating: boolean
}

const empty = {
  title: '',
  contactName: '',
  contactPhone: '',
  stageId: '',
  value: '',
  serviceType: '',
  propertyType: '',
  originAddress: '',
  destinationAddress: '',
  movingDate: '',
  source: '',
  responsible: '',
}

export function CrmNewLeadDialog({ open, onOpenChange, pipeline, onCreate, isCreating }: CrmNewLeadDialogProps) {
  const [form, setForm] = useState(empty)
  const set = (key: keyof typeof empty) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const openStages = pipeline.stages.filter((s) => s.type === 'open')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      await onCreate({
        pipelineId: pipeline.id,
        stageId: form.stageId || undefined,
        title: form.title.trim(),
        contactName: form.contactName.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        value: form.value ? Number(form.value) : undefined,
        serviceType: (form.serviceType || null) as CrmServiceType | null,
        propertyType: form.propertyType || null,
        originAddress: form.originAddress.trim() || null,
        destinationAddress: form.destinationAddress.trim() || null,
        movingDate: form.movingDate || null,
        source: form.source || null,
        responsible: form.responsible.trim() || null,
      })
      setForm(empty)
    } catch {
      /* toast exibido pelo controller */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Cadastre uma oportunidade de mudança no funil &quot;{pipeline.name}&quot;.</DialogDescription>
        </DialogHeader>
        <form id="crm-new-lead" onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome do lead *" className="sm:col-span-2">
            <input autoFocus required className={fieldCls} value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="Ex.: Mudança apto Maria — Pinheiros → Moema" />
          </Field>
          <Field label="Nome do contato">
            <input className={fieldCls} value={form.contactName} onChange={(e) => set('contactName')(e.target.value)} />
          </Field>
          <Field label="Telefone (WhatsApp)">
            <input className={fieldCls} value={form.contactPhone} onChange={(e) => set('contactPhone')(e.target.value)} placeholder="+55 11 99999-9999" />
          </Field>
          <Field label="Etapa">
            <SelectField value={form.stageId} onChange={set('stageId')} placeholder={openStages[0]?.name ?? ''} options={openStages.slice(1).map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Valor do orçamento (R$)">
            <input type="number" min="0" step="0.01" className={fieldCls} value={form.value} onChange={(e) => set('value')(e.target.value)} />
          </Field>
          <Field label="Tipo de serviço">
            <SelectField value={form.serviceType} onChange={set('serviceType')} placeholder="Selecione" options={Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          </Field>
          <Field label="Tipo de imóvel">
            <SelectField value={form.propertyType} onChange={set('propertyType')} placeholder="Selecione" options={PROPERTY_TYPES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Endereço de origem">
            <input className={fieldCls} value={form.originAddress} onChange={(e) => set('originAddress')(e.target.value)} />
          </Field>
          <Field label="Endereço de destino">
            <input className={fieldCls} value={form.destinationAddress} onChange={(e) => set('destinationAddress')(e.target.value)} />
          </Field>
          <Field label="Data da mudança">
            <input type="date" className={fieldCls} value={form.movingDate} onChange={(e) => set('movingDate')(e.target.value)} />
          </Field>
          <Field label="Origem do lead">
            <SelectField value={form.source} onChange={set('source')} placeholder="Selecione" options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />
          </Field>
          <Field label="Responsável" className="sm:col-span-2">
            <input className={fieldCls} value={form.responsible} onChange={(e) => set('responsible')(e.target.value)} placeholder="Vendedor responsável" />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="brand" type="submit" form="crm-new-lead" disabled={isCreating || !form.title.trim()}>
            {isCreating ? 'Criando…' : 'Criar lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
