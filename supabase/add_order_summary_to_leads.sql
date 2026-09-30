-- Script para garantir as colunas de serviço na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS order_summary text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS service_name text;
