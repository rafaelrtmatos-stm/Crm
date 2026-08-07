-- Schema inicial para o CRM Rafa Arts Graphics (clientes, produtos, vendas, mensagens)
-- Rode esse script no Supabase: SQL Editor -> New Query -> cole tudo -> Run

create extension if not exists "pgcrypto";

-- CLIENTES (equivalente aos "Leads/Contatos")
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  full_name text not null,
  phone text,
  email text,
  cpf_cnpj text,
  city text,
  state text,
  tags text[],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRODUTOS (estoque / mercadorias da gráfica)
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  name text not null,
  code text,
  category text,
  unit text not null default 'un', -- un, kg, m, m2, rolo, litro
  sale_price numeric(12,2) not null default 0,
  cost_price numeric(12,2),
  current_stock numeric(12,2) not null default 0,
  min_stock numeric(12,2) not null default 0,
  is_service boolean not null default false,
  is_active boolean not null default true,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- VENDAS (pedidos do PDV)
create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  order_number text,
  cliente_id uuid references clientes(id) on delete set null,
  customer_name text,
  customer_phone text,
  items jsonb not null default '[]', -- [{ product_id, name, price, quantity, discount, notes }]
  total numeric(12,2) not null default 0,
  down_payment numeric(12,2) default 0,
  received_value numeric(12,2) default 0,
  payment_method text, -- dinheiro | pix | cartao_credito | cartao_debito | misto | boleto | transferencia
  status text not null default 'pending', -- pending | completed | canceled | Em Produção | etc.
  seller_name text,
  seller_id text,
  notes text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CONVERSAS (WhatsApp/Instagram/Facebook)
create table if not exists conversas (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts',
  cliente_id uuid references clientes(id) on delete set null,
  channel_type text not null, -- whatsapp | instagram | facebook | email
  assigned_user_id text,
  subject text,
  last_message_at timestamptz,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- MENSAGENS
create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references conversas(id) on delete cascade,
  sender_type text not null, -- customer | agent | system | bot
  sender_user_id text,
  content_type text not null default 'text', -- text | image | audio | video | file | location | note
  text text,
  media_url text,
  file_name text,
  is_internal_note boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indices uteis
create index if not exists idx_vendas_cliente on vendas(cliente_id);
create index if not exists idx_vendas_created on vendas(created_at desc);
create index if not exists idx_mensagens_conversa on mensagens(conversa_id, created_at);
create index if not exists idx_conversas_cliente on conversas(cliente_id);
create index if not exists idx_clientes_phone on clientes(phone);
create index if not exists idx_produtos_code on produtos(code);

-- RLS: por enquanto liberado (igual ao Firestore atual), ja que o app usa a chave anon direto no navegador.
-- Se quiser travar por empresa/usuario no futuro, e so trocar essas policies.
alter table clientes enable row level security;
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table conversas enable row level security;
alter table mensagens enable row level security;

create policy "allow all clientes" on clientes for all using (true) with check (true);
create policy "allow all produtos" on produtos for all using (true) with check (true);
create policy "allow all vendas" on vendas for all using (true) with check (true);
create policy "allow all conversas" on conversas for all using (true) with check (true);
create policy "allow all mensagens" on mensagens for all using (true) with check (true);

-- CONFIGURACOES (chave PIX e outros dados personalizados da empresa)
create table if not exists configuracoes (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'rafa-arts' unique,
  pix_key text,
  pix_key_type text, -- cpf | cnpj | phone | email | random
  beneficiary_name text,
  city text,
  updated_at timestamptz not null default now()
);

alter table configuracoes enable row level security;
create policy "allow all configuracoes" on configuracoes for all using (true) with check (true);
