import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { supabase } from '../supabase';
import { normalizarTelefoneBR, chaveDoContato } from './phone';

export const GOOGLE_CONTACTS_SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.readonly',
];

export type SyncFrequency = 'manual' | 'daily' | 'weekly' | 'monthly';

export interface GoogleSyncScheduleConfig {
  frequency: SyncFrequency;
  lastSyncAt?: string;
  nextSyncAt?: string;
  direction?: 'both' | 'export_only' | 'import_only';
}

export interface GoogleExportResult {
  totalSystem: number;
  exported: number;
  alreadyExisted: number;
  skipped: number;
  errors: string[];
}

export interface DuplicateGroup {
  key: string;
  label: string;
  reason: 'phone' | 'name';
  clients: any[];
}

// In-memory token cache (mandated by workspace_integration skill)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleContactItem {
  resourceName: string;
  id: string;
  name: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  photoUrl?: string;
}

export interface GoogleSyncResult {
  totalGoogle: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  errors: string[];
}

export interface GoogleConnectedAccount {
  email: string;
  name: string;
  photoUrl?: string;
  connectedAt: string;
  lastSyncAt?: string;
}

const STORAGE_ACCOUNT_KEY = 'rpro_google_account_info';
const STORAGE_SYNC_TOKEN_KEY = 'rpro_google_sync_token';

// Recupera informações da conta conectada salvas no navegador
export function getSavedGoogleAccount(): GoogleConnectedAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGoogleAccountInfo(info: GoogleConnectedAccount | null) {
  try {
    if (info) {
      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(info));
    } else {
      localStorage.removeItem(STORAGE_ACCOUNT_KEY);
      localStorage.removeItem(STORAGE_SYNC_TOKEN_KEY);
    }
  } catch (err) {
    console.error('Erro ao salvar conta Google:', err);
  }
}

// Inicia login/autorização com o Google usando Firebase Auth
export async function connectGoogleContacts(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    GOOGLE_CONTACTS_SCOPES.forEach(scope => provider.addScope(scope));
    // Força seleção de conta se necessário
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso da conta Google.');
    }

    cachedAccessToken = credential.accessToken;

    const accountInfo: GoogleConnectedAccount = {
      email: result.user.email || '',
      name: result.user.displayName || 'Usuário Google',
      photoUrl: result.user.photoURL || undefined,
      connectedAt: new Date().toISOString(),
    };
    saveGoogleAccountInfo(accountInfo);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Erro ao autenticar com Google Contatos:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
}

// Desconecta a conta Google
export async function disconnectGoogleContacts(): Promise<void> {
  cachedAccessToken = null;
  saveGoogleAccountInfo(null);
}

// Obtém o token de acesso (se já existir em memória ou solicita conexão)
export async function getValidAccessToken(forcePrompt = false): Promise<string> {
  if (cachedAccessToken && !forcePrompt) {
    return cachedAccessToken;
  }
  const { accessToken } = await connectGoogleContacts();
  return accessToken;
}

// Busca todos os contatos do Google People API
export async function fetchGoogleConnections(accessToken: string): Promise<{ contacts: GoogleContactItem[]; nextSyncToken?: string }> {
  const contacts: GoogleContactItem[] = [];
  let pageToken: string | undefined = undefined;
  let nextSyncToken: string | undefined = undefined;

  do {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,photos',
      pageSize: '500',
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const res = await fetch(`https://people.googleapis.com/v1/people/me/connections?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sessão do Google expirada. Por favor, conecte novamente.');
    }

    if (!res.ok) {
      let msg = `Erro ao consultar contatos do Google (${res.status})`;
      try {
        const errorJson = await res.json();
        if (errorJson?.error) {
          if (typeof errorJson.error === 'string') {
            msg = errorJson.error;
          } else if (errorJson.error.message) {
            msg = errorJson.error.message;
            if (errorJson.error.status === 'PERMISSION_DENIED') {
              msg = 'Permissão negada. Por favor, desconecte e conecte novamente concedendo acesso aos seus contatos do Google.';
            }
          }
        }
      } catch {
        // Fallback to text
        const text = await res.text().catch(() => '');
        if (text) msg = text;
      }
      throw new Error(msg);
    }

    const data = await res.json();
    const connections = data.connections || [];
    nextSyncToken = data.nextSyncToken;

    for (const person of connections) {
      const resourceName = person.resourceName || '';
      const id = resourceName.replace('people/', '');
      const name = person.names?.[0]?.displayName || person.names?.[0]?.givenName || '';
      
      const phoneNumbers = person.phoneNumbers || [];
      const primaryPhoneRaw = phoneNumbers[0]?.value || '';
      const secondaryPhoneRaw = phoneNumbers[1]?.value || '';

      const email = person.emailAddresses?.[0]?.value || '';
      const photoUrl = person.photos?.[0]?.url;

      // Pelo menos um dado de contato útil
      if (!name && !primaryPhoneRaw && !email) {
        continue;
      }

      contacts.push({
        resourceName,
        id,
        name: name.trim() || 'Contato sem Nome',
        phone: primaryPhoneRaw.trim() || undefined,
        alternativePhone: secondaryPhoneRaw.trim() || undefined,
        email: email.trim().toLowerCase() || undefined,
        photoUrl: photoUrl && !photoUrl.includes('default-user') ? photoUrl : undefined,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return { contacts, nextSyncToken };
}

// Sincroniza os contatos do Google com a tabela "clientes" do Supabase
export async function syncGoogleContactsWithDatabase(
  companyId: string | null = 'rafa-arts',
  onProgress?: (current: number, total: number, statusText: string) => void,
  overrideToken?: string
): Promise<GoogleSyncResult> {
  const result: GoogleSyncResult = {
    totalGoogle: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: [],
  };

  onProgress?.(0, 0, 'Obtendo autorização do Google...');
  const accessToken = overrideToken || await getValidAccessToken();

  onProgress?.(0, 0, 'Buscando contatos na sua conta Google...');
  const { contacts } = await fetchGoogleConnections(accessToken);
  result.totalGoogle = contacts.length;

  if (contacts.length === 0) {
    onProgress?.(0, 0, 'Nenhum contato encontrado no Google.');
    return result;
  }

  onProgress?.(0, contacts.length, 'Carregando clientes cadastrados no sistema...');
  let query = supabase.from('clientes').select('*');
  if (companyId) {
    query = query.or(`company_id.eq.${companyId},company_id.is.null`);
  }
  const { data: existingClients, error } = await query;
  if (error) {
    throw new Error(`Falha ao ler clientes existentes: ${error.message}`);
  }

  // Mapeia clientes existentes por telefone normalizado e por email
  const clientByPhoneMap = new Map<string, any>();
  const clientByEmailMap = new Map<string, any>();

  for (const client of (existingClients || [])) {
    const rawPhone = client.telefone || client.phone;
    if (rawPhone) {
      const normalized = chaveDoContato(rawPhone);
      if (normalized) clientByPhoneMap.set(normalized, client);
    }
    const rawAlt = client.telefone_alternativo;
    if (rawAlt) {
      const normalizedAlt = chaveDoContato(rawAlt);
      if (normalizedAlt) clientByPhoneMap.set(normalizedAlt, client);
    }
    const email = (client.email || '').trim().toLowerCase();
    if (email) {
      clientByEmailMap.set(email, client);
    }
  }

  // Itera e sincroniza
  let processed = 0;
  for (const contact of contacts) {
    processed++;
    if (processed % 10 === 0 || processed === contacts.length) {
      onProgress?.(processed, contacts.length, `Sincronizando ${processed} de ${contacts.length}...`);
    }

    const normPhone = contact.phone ? chaveDoContato(contact.phone) : '';
    const normAltPhone = contact.alternativePhone ? chaveDoContato(contact.alternativePhone) : '';
    const contactEmail = contact.email || '';

    // Se não tem telefone nem e-mail, ignora para não poluir com dados vazios
    if (!normPhone && !contactEmail) {
      result.skipped++;
      continue;
    }

    // Procura se já existe no CRM
    let matchedClient: any = null;
    if (normPhone && clientByPhoneMap.has(normPhone)) {
      matchedClient = clientByPhoneMap.get(normPhone);
    } else if (normAltPhone && clientByPhoneMap.has(normAltPhone)) {
      matchedClient = clientByPhoneMap.get(normAltPhone);
    } else if (contactEmail && clientByEmailMap.has(contactEmail)) {
      matchedClient = clientByEmailMap.get(contactEmail);
    }

    if (matchedClient) {
      // Cliente já existe: atualiza campos vazios sem sobrescrever dados preenchidos manualmente
      const updates: any = {};
      let needsUpdate = false;

      // Se o cliente não tinha email e o Google tem
      if (!matchedClient.email && contactEmail) {
        updates.email = contactEmail;
        needsUpdate = true;
      }
      // Se não tinha telefone e o Google tem
      if (!matchedClient.phone && normPhone) {
        updates.phone = contact.phone;
        needsUpdate = true;
      }
      // Se tem um segundo telefone no Google e o cliente não tem telefone alternativo
      if (!matchedClient.telefone_alternativo && contact.alternativePhone && contact.alternativePhone !== matchedClient.phone) {
        updates.telefone_alternativo = contact.alternativePhone;
        needsUpdate = true;
      }
      // Se o nome atual do cliente for "Sem Nome" ou genérico, adota o nome do Google
      const currentName = (matchedClient.full_name || '').trim();
      if ((!currentName || currentName.toLowerCase() === 'sem nome' || currentName.toLowerCase() === 'cliente') && contact.name) {
        updates.full_name = contact.name;
        needsUpdate = true;
      }

      if (needsUpdate) {
        try {
          updates.updated_at = new Date().toISOString();
          const { error: updErr } = await supabase
            .from('clientes')
            .update(updates)
            .eq('id', matchedClient.id);

          if (updErr) {
            result.errors.push(`Erro ao atualizar ${contact.name}: ${updErr.message}`);
          } else {
            result.updated++;
            // Atualiza cópia local em memória
            Object.assign(matchedClient, updates);
          }
        } catch (err: any) {
          result.errors.push(`Erro ao atualizar ${contact.name}: ${err.message}`);
        }
      } else {
        result.unchanged++;
      }
    } else {
      // Cliente novo: insere
      try {
        const newClientPayload: any = {
          full_name: contact.name || 'Contato Google',
          phone: contact.phone || '',
          telefone_alternativo: contact.alternativePhone || null,
          email: contactEmail || null,
          notes: 'Importado via Google Contatos',
          company_id: companyId || 'rafa-arts',
          saldo_credito: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: inserted, error: insErr } = await supabase
          .from('clientes')
          .insert([newClientPayload])
          .select()
          .maybeSingle();

        if (insErr) {
          result.errors.push(`Erro ao criar ${contact.name}: ${insErr.message}`);
        } else {
          result.created++;
          if (normPhone) clientByPhoneMap.set(normPhone, inserted);
          if (normAltPhone) clientByPhoneMap.set(normAltPhone, inserted);
          if (contactEmail) clientByEmailMap.set(contactEmail, inserted);
        }
      } catch (err: any) {
        result.errors.push(`Erro ao inserir ${contact.name}: ${err.message}`);
      }
    }
  }

  // Atualiza data de última sincronização
  const account = getSavedGoogleAccount();
  if (account) {
    account.lastSyncAt = new Date().toISOString();
    saveGoogleAccountInfo(account);
  }

  onProgress?.(contacts.length, contacts.length, 'Sincronização concluída com sucesso!');
  return result;
}

// Configuração de agendamento de sincronização
const STORAGE_SYNC_CONFIG_KEY = 'rpro_google_sync_config';

export function getGoogleSyncConfig(): GoogleSyncScheduleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_SYNC_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    frequency: 'daily',
    direction: 'both',
  };
}

export function saveGoogleSyncConfig(cfg: GoogleSyncScheduleConfig): void {
  try {
    localStorage.setItem(STORAGE_SYNC_CONFIG_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error('Erro ao salvar configuração de sincronização:', err);
  }
}

// Cria um único contato no Google People API
export async function createGoogleContact(
  accessToken: string,
  contact: { name: string; phone?: string; email?: string; notes?: string }
): Promise<GoogleContactItem> {
  const body: any = {
    names: [{ givenName: contact.name.trim() || 'Cliente' }],
  };
  if (contact.phone) {
    body.phoneNumbers = [{ value: contact.phone.trim(), type: 'mobile' }];
  }
  if (contact.email) {
    body.emailAddresses = [{ value: contact.email.trim(), type: 'work' }];
  }
  if (contact.notes) {
    body.userDefined = [{ key: 'Origem', value: contact.notes.trim() }];
  }

  const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errDetail = `Erro ao salvar contato no Google (${res.status})`;
    try {
      const j = await res.json();
      if (j.error?.message) errDetail = j.error.message;
    } catch {}
    throw new Error(errDetail);
  }

  const data = await res.json();
  const resourceName = data.resourceName || '';
  const id = resourceName.replace('people/', '');
  return {
    resourceName,
    id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
  };
}

// Salva um único contato no Google (usado diretamente no chat / CRM)
export async function exportSingleContactToGoogle(
  contact: { name: string; phone?: string; email?: string; notes?: string },
  overrideToken?: string
): Promise<GoogleContactItem> {
  const token = overrideToken || (await getValidAccessToken());
  return await createGoogleContact(token, contact);
}

// Exporta contatos do sistema (clientes/leads) para o Google Contacts
export async function exportContactsToGoogle(
  companyId: string | null = 'rafa-arts',
  selectedClients?: any[],
  onProgress?: (current: number, total: number, statusText: string) => void,
  overrideToken?: string
): Promise<GoogleExportResult> {
  const result: GoogleExportResult = {
    totalSystem: 0,
    exported: 0,
    alreadyExisted: 0,
    skipped: 0,
    errors: [],
  };

  onProgress?.(0, 0, 'Obtendo autorização do Google...');
  const accessToken = overrideToken || (await getValidAccessToken());

  // 1. Obter lista de contatos do sistema
  let clientsList: any[] = [];
  if (selectedClients && selectedClients.length > 0) {
    clientsList = selectedClients;
  } else {
    onProgress?.(0, 0, 'Buscando clientes no sistema...');
    let query = supabase.from('clientes').select('*');
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Falha ao ler clientes: ${error.message}`);
    clientsList = data || [];
  }

  result.totalSystem = clientsList.length;
  if (clientsList.length === 0) {
    onProgress?.(0, 0, 'Nenhum cliente para exportar.');
    return result;
  }

  // 2. Buscar contatos já existentes no Google para não duplicar
  onProgress?.(0, clientsList.length, 'Consultando contatos existentes no Google...');
  let existingGoogleContacts: GoogleContactItem[] = [];
  try {
    const { contacts } = await fetchGoogleConnections(accessToken);
    existingGoogleContacts = contacts;
  } catch (err: any) {
    console.warn('Aviso ao consultar Google:', err);
  }

  const googlePhonesSet = new Set<string>();
  const googleEmailsSet = new Set<string>();
  for (const gc of existingGoogleContacts) {
    if (gc.phone) {
      const k = chaveDoContato(gc.phone);
      if (k) googlePhonesSet.add(k);
    }
    if (gc.alternativePhone) {
      const k = chaveDoContato(gc.alternativePhone);
      if (k) googlePhonesSet.add(k);
    }
    if (gc.email) {
      googleEmailsSet.add(gc.email.trim().toLowerCase());
    }
  }

  // 3. Exportar apenas os que não existem no Google
  let processed = 0;
  for (const client of clientsList) {
    processed++;
    const name = (client.nome || client.full_name || '').trim();
    const phone = (client.telefone || client.phone || '').trim();
    const email = (client.email || '').trim().toLowerCase();

    if (processed % 5 === 0 || processed === clientsList.length) {
      onProgress?.(processed, clientsList.length, `Enviando ${processed} de ${clientsList.length}...`);
    }

    // Se não tem nem telefone nem e-mail, ignora
    if (!phone && !email) {
      result.skipped++;
      continue;
    }

    const normPhone = phone ? chaveDoContato(phone) : '';
    const alreadyInGoogle =
      (normPhone && googlePhonesSet.has(normPhone)) ||
      (email && googleEmailsSet.has(email));

    if (alreadyInGoogle) {
      result.alreadyExisted++;
      continue;
    }

    try {
      await createGoogleContact(accessToken, {
        name: name || 'Cliente Rafa Arts',
        phone: phone || undefined,
        email: email || undefined,
        notes: `Cadastrado no RPro Sistema (${companyId || 'rafa-arts'})`,
      });
      result.exported++;
      if (normPhone) googlePhonesSet.add(normPhone);
      if (email) googleEmailsSet.add(email);
    } catch (err: any) {
      result.errors.push(`Erro ao salvar ${name || phone}: ${err?.message || 'erro de rede'}`);
    }
  }

  // Atualiza data de última sincronização
  const account = getSavedGoogleAccount();
  if (account) {
    account.lastSyncAt = new Date().toISOString();
    saveGoogleAccountInfo(account);
  }

  onProgress?.(clientsList.length, clientsList.length, 'Exportação para o Google concluída!');
  return result;
}

// Detecta contatos duplicados agrupados por telefone ou nome
export function detectDuplicateClients(clients: any[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const phoneMap = new Map<string, any[]>();
  const nameMap = new Map<string, any[]>();

  for (const c of clients) {
    const rawPhone = c.telefone || c.phone;
    if (rawPhone) {
      const key = chaveDoContato(rawPhone);
      if (key && key.length >= 8) {
        const list = phoneMap.get(key) || [];
        list.push(c);
        phoneMap.set(key, list);
      }
    }

    const rawName = (c.nome || c.full_name || '').trim().toLowerCase();
    if (rawName && rawName.length >= 3 && rawName !== 'cliente' && rawName !== 'sem nome') {
      const list = nameMap.get(rawName) || [];
      list.push(c);
      nameMap.set(rawName, list);
    }
  }

  const seenGroupIds = new Set<string>();

  // Duplicados por telefone
  for (const [phoneKey, items] of phoneMap.entries()) {
    if (items.length > 1) {
      const formattedPhone = items[0].telefone || items[0].phone || phoneKey;
      const groupKey = `phone-${phoneKey}`;
      seenGroupIds.add(groupKey);
      groups.push({
        key: groupKey,
        label: `Telefone: ${formattedPhone}`,
        reason: 'phone',
        clients: items,
      });
    }
  }

  // Duplicados por nome (que não caíram no mesmo grupo de telefone)
  for (const [nameKey, items] of nameMap.entries()) {
    if (items.length > 1) {
      const groupKey = `name-${nameKey}`;
      const allSamePhone = items.every((item) => {
        const k = chaveDoContato(item.telefone || item.phone || '');
        return k && phoneMap.get(k)?.length! > 1;
      });
      if (!allSamePhone && !seenGroupIds.has(groupKey)) {
        groups.push({
          key: groupKey,
          label: `Nome idêntico: "${items[0].nome || items[0].full_name}"`,
          reason: 'name',
          clients: items,
        });
      }
    }
  }

  return groups;
}

// Exclui clientes em lote
export async function deleteClientsBatch(ids: string[]): Promise<{ deleted: number; error?: string }> {
  if (!ids || ids.length === 0) return { deleted: 0 };
  try {
    const { error } = await supabase.from('clientes').delete().in('id', ids);
    if (error) throw error;
    return { deleted: ids.length };
  } catch (err: any) {
    console.error('Erro ao excluir clientes em lote:', err);
    return { deleted: 0, error: err?.message || 'Falha na exclusão.' };
  }
}

// Mescla múltiplos clientes duplicados em um único contato principal
export async function mergeClientsBatch(
  masterId: string,
  duplicateIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const idsToRemove = duplicateIds.filter((id) => id !== masterId);
  if (idsToRemove.length === 0) return { success: true };

  try {
    const { data: records } = await supabase
      .from('clientes')
      .select('*')
      .in('id', [masterId, ...idsToRemove]);

    const master = records?.find((r) => r.id === masterId);
    if (!master) throw new Error('Cliente principal não encontrado.');

    const updates: any = {};
    for (const d of (records || []).filter((r) => r.id !== masterId)) {
      if (!master.email && d.email) updates.email = d.email;
      if (!master.cpf_cnpj && d.cpf_cnpj) updates.cpf_cnpj = d.cpf_cnpj;
      if (!master.endereco && d.endereco) updates.endereco = d.endereco;
      if (!master.telefone_alternativo && d.telefone_alternativo && d.telefone_alternativo !== master.phone) {
        updates.telefone_alternativo = d.telefone_alternativo;
      }
      if (!master.notes && d.notes) updates.notes = d.notes;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from('clientes').update(updates).eq('id', masterId);
    }

    const { error: delErr } = await supabase.from('clientes').delete().in('id', idsToRemove);
    if (delErr) throw delErr;

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao mesclar clientes:', err);
    return { success: false, error: err?.message || 'Falha ao mesclar.' };
  }
}
