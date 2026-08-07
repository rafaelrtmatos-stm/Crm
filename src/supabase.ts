import { createClient } from '@supabase/supabase-js';

// Projeto Supabase dedicado deste CRM (Rafa Arts Graphics).
// Separado do Supabase usado pelo Rumo ao Milhão (RA1M).
const SUPABASE_URL = 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
