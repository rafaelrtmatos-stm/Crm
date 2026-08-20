-- Rode esse SQL no Supabase.
-- Guarda o ultimo status de presenca de cada contato do WhatsApp (visto por
-- ultimo / online / digitando / gravando audio), alimentado pelo evento
-- PRESENCE_UPDATE que a Evolution API manda no webhook (api/whatsapp-webhook.js)
-- depois que o front assina a presenca daquele chat (api/whatsapp-presence-subscribe.js).

create table if not exists whatsapp_presence (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  phone text not null,
  -- available = online agora | composing = digitando | recording = gravando audio |
  -- unavailable = offline (nesse caso last_seen_at guarda a hora do "visto por ultimo")
  status text not null default 'unavailable',
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (company_id, phone)
);

create index if not exists idx_whatsapp_presence_company_phone on whatsapp_presence(company_id, phone);

NOTIFY pgrst, 'reload schema';
