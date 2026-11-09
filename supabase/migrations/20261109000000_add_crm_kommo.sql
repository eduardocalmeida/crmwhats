-- =============================================================================
-- Migration: CRM de vendas (modelo Kommo) — Mude Bem
-- =============================================================================
-- Estrutura inspirada no Kommo:
--   * Funis (pipelines) com etapas (stages) ordenadas, incluindo etapas
--     terminais "Ganho" e "Perdido"
--   * Leads (negócios) vinculados a contatos, com valor, responsável, tags,
--     motivo de perda e campos específicos de mudança (origem, destino, data...)
--   * Tarefas por lead (ligar, visita técnica, follow-up...) com prazo
--   * Timeline/feed do lead (notas, mudanças de etapa, tarefas concluídas)
--   * Motivos de perda configuráveis
--
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT, pois o installer reexecuta
-- todas as migrations em ordem.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_pipelines (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text DEFAULT '#3b82f6' NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    type text DEFAULT 'open' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_crm_stages_type CHECK (type = ANY (ARRAY['open'::text, 'won'::text, 'lost'::text]))
);

CREATE TABLE IF NOT EXISTS public.crm_loss_reasons (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.crm_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
    stage_id uuid NOT NULL REFERENCES public.crm_stages(id) ON DELETE RESTRICT,
    title text NOT NULL,
    contact_id text REFERENCES public.contacts(id) ON DELETE SET NULL,
    value numeric(14,2) DEFAULT 0 NOT NULL,
    responsible text,
    source text,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    loss_reason text,
    -- Campos específicos de mudança (Mude Bem)
    service_type text,
    property_type text,
    origin_address text,
    destination_address text,
    moving_date date,
    volume_m3 numeric(10,2),
    needs_packing boolean DEFAULT false NOT NULL,
    needs_storage boolean DEFAULT false NOT NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order double precision DEFAULT 0 NOT NULL,
    stage_changed_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_pipeline_stage ON public.crm_leads (pipeline_id, stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON public.crm_leads (contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline ON public.crm_stages (pipeline_id, sort_order);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    title text NOT NULL,
    type text DEFAULT 'follow_up' NOT NULL,
    due_at timestamp with time zone NOT NULL,
    responsible text,
    completed_at timestamp with time zone,
    result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_crm_tasks_type CHECK (type = ANY (ARRAY['call'::text, 'meeting'::text, 'visit'::text, 'follow_up'::text, 'email'::text, 'other'::text]))
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead ON public.crm_tasks (lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_open_due ON public.crm_tasks (due_at) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.crm_lead_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    type text DEFAULT 'note' NOT NULL,
    content text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_crm_lead_events_type CHECK (type = ANY (ARRAY['note'::text, 'created'::text, 'stage_change'::text, 'task_created'::text, 'task_completed'::text, 'updated'::text]))
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_events_lead ON public.crm_lead_events (lead_id, created_at DESC);

-- RLS: app usa service_role (bypassa RLS). Sem acesso para anon/authenticated.
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.crm_pipelines FROM anon, authenticated;
REVOKE ALL ON TABLE public.crm_stages FROM anon, authenticated;
REVOKE ALL ON TABLE public.crm_loss_reasons FROM anon, authenticated;
REVOKE ALL ON TABLE public.crm_leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.crm_tasks FROM anon, authenticated;
REVOKE ALL ON TABLE public.crm_lead_events FROM anon, authenticated;

-- =============================================================================
-- Seed: funil padrão "Mudanças" da Mude Bem
-- =============================================================================
DO $$
DECLARE
  v_pipeline_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crm_pipelines) THEN
    INSERT INTO public.crm_pipelines (name, is_default, sort_order)
    VALUES ('Mudanças', true, 0)
    RETURNING id INTO v_pipeline_id;

    INSERT INTO public.crm_stages (pipeline_id, name, color, sort_order, type) VALUES
      (v_pipeline_id, 'Leads de entrada',        '#94a3b8', 0, 'open'),
      (v_pipeline_id, 'Primeiro contato',        '#38bdf8', 1, 'open'),
      (v_pipeline_id, 'Vistoria agendada',       '#a78bfa', 2, 'open'),
      (v_pipeline_id, 'Orçamento enviado',       '#fbbf24', 3, 'open'),
      (v_pipeline_id, 'Negociação',              '#fb923c', 4, 'open'),
      (v_pipeline_id, 'Mudança agendada',        '#2dd4bf', 5, 'open'),
      (v_pipeline_id, 'Ganho',                   '#22c55e', 6, 'won'),
      (v_pipeline_id, 'Perdido',                 '#ef4444', 7, 'lost');
  END IF;
END $$;

INSERT INTO public.crm_loss_reasons (name, sort_order) VALUES
  ('Preço acima do esperado', 0),
  ('Fechou com concorrente', 1),
  ('Data indisponível', 2),
  ('Desistiu da mudança', 3),
  ('Sem resposta do cliente', 4),
  ('Fora da área de atendimento', 5)
ON CONFLICT (name) DO NOTHING;
