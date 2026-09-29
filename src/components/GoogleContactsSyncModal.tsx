import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Download, 
  Upload,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Clock,
  Trash2,
  GitMerge,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { Modal, Button, Badge, GoogleLogo, GlassCard, cn } from './SharedUI';
import { 
  getSavedGoogleAccount, 
  connectGoogleContacts, 
  disconnectGoogleContacts, 
  syncGoogleContactsWithDatabase, 
  exportContactsToGoogle,
  getGoogleSyncConfig,
  saveGoogleSyncConfig,
  detectDuplicateClients,
  deleteClientsBatch,
  mergeClientsBatch,
  GoogleConnectedAccount, 
  GoogleSyncResult,
  GoogleExportResult,
  SyncFrequency,
  DuplicateGroup
} from '../lib/googleContacts';
import { supabase } from '../supabase';
import { showAlert, showConfirm } from '../lib/notify';

interface GoogleContactsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (result: any) => void;
  companyId?: string | null;
  initialTab?: 'sincronizacao' | 'contatos';
}

export const GoogleContactsSyncModal: React.FC<GoogleContactsSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  companyId = 'rafa-arts',
  initialTab = 'sincronizacao'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sincronizacao' | 'contatos'>(initialTab);
  const [account, setAccount] = useState<GoogleConnectedAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [actionType, setActionType] = useState<'import' | 'export' | 'both'>('both');
  const [progressText, setProgressText] = useState('');
  const [progressCount, setProgressCount] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<GoogleSyncResult | null>(null);
  const [exportResult, setExportResult] = useState<GoogleExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Agendamento
  const [syncConfig, setSyncConfig] = useState(() => getGoogleSyncConfig());

  // Clientes do sistema e duplicados
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'duplicates' | 'no_phone'>('all');
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [mergingBatch, setMergingBatch] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccount(getSavedGoogleAccount());
      setSyncConfig(getGoogleSyncConfig());
      setImportResult(null);
      setExportResult(null);
      setErrorMessage(null);
      setActiveSubTab(initialTab);
      loadClients();
    }
  }, [isOpen, initialTab]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      let query = supabase.from('clientes').select('*').order('full_name', { ascending: true });
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const duplicateGroups = useMemo(() => {
    return detectDuplicateClients(clients);
  }, [clients]);

  const duplicateIdsSet = useMemo(() => {
    const set = new Set<string>();
    duplicateGroups.forEach(g => {
      g.clients.forEach(c => set.add(c.id));
    });
    return set;
  }, [duplicateGroups]);

  // Lista filtrada para exibição
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const name = (c.nome || c.full_name || '').toLowerCase();
      const phone = (c.telefone || c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const s = searchTerm.toLowerCase().trim();

      const matchesSearch = !s || name.includes(s) || phone.includes(s) || email.includes(s);
      if (!matchesSearch) return false;

      if (filterMode === 'duplicates') {
        return duplicateIdsSet.has(c.id);
      }
      if (filterMode === 'no_phone') {
        return !c.telefone && !c.phone;
      }
      return true;
    });
  }, [clients, searchTerm, filterMode, duplicateIdsSet]);

  const handleConnect = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { accessToken } = await connectGoogleContacts();
      const acc = getSavedGoogleAccount();
      setAccount(acc);
      showAlert('Conta Google conectada com sucesso!');
    } catch (err: any) {
      console.error(err);
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        setErrorMessage(err?.message || 'Falha ao autenticar com o Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (await showConfirm('Deseja realmente desconectar sua conta do Google?')) {
      await disconnectGoogleContacts();
      setAccount(null);
      setImportResult(null);
      setExportResult(null);
    }
  };

  // Salva a frequência de sincronização
  const handleFrequencyChange = (freq: SyncFrequency) => {
    const updated = {
      ...syncConfig,
      frequency: freq,
      lastSyncAt: syncConfig.lastSyncAt,
      nextSyncAt: calculateNextSync(freq)
    };
    setSyncConfig(updated);
    saveGoogleSyncConfig(updated);
    showAlert(`Frequência de sincronização alterada para: ${getFrequencyLabel(freq)}.`);
  };

  const calculateNextSync = (freq: SyncFrequency): string | undefined => {
    if (freq === 'manual') return undefined;
    const now = new Date();
    if (freq === 'daily') now.setDate(now.getDate() + 1);
    else if (freq === 'weekly') now.setDate(now.getDate() + 7);
    else if (freq === 'monthly') now.setMonth(now.getMonth() + 1);
    return now.toISOString();
  };

  const getFrequencyLabel = (freq: SyncFrequency) => {
    switch (freq) {
      case 'daily': return 'Por Dia (Diário)';
      case 'weekly': return 'Por Semana (Semanal)';
      case 'monthly': return 'Por Mês (Mensal)';
      default: return 'Agora / Manual';
    }
  };

  // Executa Exportação (Salvar no Google)
  const handleExportToGoogle = async (specificClients?: any[]) => {
    if (!account) {
      showAlert('Conecte sua conta do Google primeiro.');
      return;
    }
    setSyncing(true);
    setActionType('export');
    setErrorMessage(null);
    setExportResult(null);
    setProgressText('Preparando envio para o Google Contatos...');
    setProgressCount({ current: 0, total: 0 });

    try {
      const res = await exportContactsToGoogle(
        companyId,
        specificClients,
        (curr, tot, text) => {
          setProgressCount({ current: curr, total: tot });
          setProgressText(text);
        }
      );
      setExportResult(res);
      setAccount(getSavedGoogleAccount());
      onSyncComplete?.(res);
      showAlert(`Concluído! ${res.exported} novo(s) contato(s) salvo(s) na sua conta Google.`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Falha ao salvar contatos no Google.');
    } finally {
      setSyncing(false);
    }
  };

  // Executa Importação (Puxar do Google)
  const handleImportFromGoogle = async () => {
    if (!account) {
      showAlert('Conecte sua conta do Google primeiro.');
      return;
    }
    setSyncing(true);
    setActionType('import');
    setErrorMessage(null);
    setImportResult(null);
    setProgressText('Consultando agenda do Google...');
    setProgressCount({ current: 0, total: 0 });

    try {
      const res = await syncGoogleContactsWithDatabase(
        companyId,
        (curr, tot, text) => {
          setProgressCount({ current: curr, total: tot });
          setProgressText(text);
        }
      );
      setImportResult(res);
      setAccount(getSavedGoogleAccount());
      onSyncComplete?.(res);
      await loadClients();
      showAlert(`Concluído! ${res.created} novo(s) contato(s) importado(s) do Google.`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Falha ao puxar contatos do Google.');
    } finally {
      setSyncing(false);
    }
  };

  // Sincronização Completa (Bidirecional)
  const handleFullSync = async () => {
    await handleImportFromGoogle();
    await handleExportToGoogle();
  };

  // Seleção de contatos
  const toggleSelectClient = (id: string) => {
    const next = new Set(selectedClientIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedClientIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedClientIds.size === filteredClients.length && filteredClients.length > 0) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleSelectOnlyDuplicates = () => {
    setSelectedClientIds(new Set(duplicateIdsSet));
  };

  // Exclusão em Massa
  const handleDeleteSelected = async () => {
    const count = selectedClientIds.size;
    if (count === 0) return;

    const confirmed = await showConfirm(
      `Tem certeza que deseja excluir em massa ${count} contato(s) selecionado(s)? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingBatch(true);
    try {
      const idsArray = Array.from(selectedClientIds) as string[];
      const { deleted, error } = await deleteClientsBatch(idsArray);
      if (error) throw new Error(error);

      showAlert(`${deleted} contato(s) excluído(s) com sucesso.`);
      setSelectedClientIds(new Set());
      await loadClients();
    } catch (err: any) {
      showAlert(`Erro ao excluir: ${err.message || 'Falha de rede.'}`);
    } finally {
      setDeletingBatch(false);
    }
  };

  // Mesclagem de duplicados selecionados
  const handleMergeGroup = async (group: DuplicateGroup) => {
    if (group.clients.length < 2) return;
    const master = group.clients[0];
    const confirmed = await showConfirm(
      `Deseja unificar ${group.clients.length} cadastros repetidos em torno do principal "${master.nome || master.full_name}" e remover as duplicatas?`
    );
    if (!confirmed) return;

    setMergingBatch(true);
    try {
      const duplicateIds = group.clients.map(c => c.id);
      const { success, error } = await mergeClientsBatch(master.id, duplicateIds);
      if (!success) throw new Error(error);

      showAlert(`Contatos unificados com sucesso em "${master.nome || master.full_name}".`);
      await loadClients();
    } catch (err: any) {
      showAlert(`Erro ao unificar: ${err.message}`);
    } finally {
      setMergingBatch(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!syncing && !deletingBatch && !mergingBatch) onClose();
      }}
      title="Central de Sincronização & Contatos Google"
      size="lg"
      className="w-full max-w-4xl mx-auto p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Cabeçalho da Conta Conectada */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 shadow-sm">
              <GoogleLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">
                  {account ? account.name : 'Conta Google'}
                </span>
                <Badge variant={account ? "success" : "outline"} className="text-[9px] uppercase font-black">
                  {account ? 'Conectado' : 'Não Conectado'}
                </Badge>
              </div>
              <p className="text-[11px] text-white/50 truncate font-mono">
                {account ? account.email : 'Conecte para sincronizar e gerenciar contatos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {account ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDisconnect}
                disabled={syncing}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 border-white/10"
              >
                <LogOut size={12} className="mr-1" /> Desconectar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleConnect}
                disabled={loading}
                className="bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs"
              >
                {loading ? 'Conectando...' : 'Conectar Conta Google'}
              </Button>
            )}
          </div>
        </div>

        {/* Abas de Navegação Interna da Central */}
        <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveSubTab('sincronizacao')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeSubTab === 'sincronizacao'
                ? "bg-primary-500 text-slate-950 shadow-md shadow-primary-500/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            <span>Sincronização & Frequência</span>
          </button>

          <button
            onClick={() => setActiveSubTab('contatos')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeSubTab === 'contatos'
                ? "bg-primary-500 text-slate-950 shadow-md shadow-primary-500/20"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Users size={13} />
            <span>Gestão de Contatos & Duplicados</span>
            {duplicateGroups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {duplicateGroups.length}
              </span>
            )}
          </button>
        </div>

        {/* ============================================================== */}
        {/* ABA 1: SINCRONIZAÇÃO & AGENDAMENTO                             */}
        {/* ============================================================== */}
        {activeSubTab === 'sincronizacao' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Bloco de Frequência de Sincronização */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-primary-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Frequência de Sincronização
                  </span>
                </div>
                {syncConfig.lastSyncAt && (
                  <span className="text-[10px] text-white/40">
                    Última execução: {new Date(syncConfig.lastSyncAt).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-white/60 leading-relaxed">
                Escolha quando o sistema deve sincronizar novos clientes e mensagens automaticamente:
              </p>

              {/* Botões de Frequência */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {(['manual', 'daily', 'weekly', 'monthly'] as SyncFrequency[]).map((freq) => {
                  const isSelected = syncConfig.frequency === freq;
                  return (
                    <button
                      key={freq}
                      onClick={() => handleFrequencyChange(freq)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                        isSelected
                          ? "bg-primary-500/15 border-primary-500/50 text-primary-300 shadow-sm"
                          : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span className="text-xs font-bold capitalize">
                        {freq === 'manual' ? 'Agora (Manual)' : freq === 'daily' ? 'Por Dia' : freq === 'weekly' ? 'Por Semana' : 'Por Mês'}
                      </span>
                      <span className="text-[9px] text-white/40 font-medium">
                        {freq === 'manual' ? 'Sob demanda' : freq === 'daily' ? 'A cada 24 horas' : freq === 'weekly' ? 'A cada 7 dias' : 'A cada 30 dias'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ações Rápidas de Sincronização */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Botão Exportar (Salvar no Google) */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <Upload size={15} />
                    <span>Salvar no Google Contatos</span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Pega os clientes e contatos cadastrados no sistema e cria direto na sua agenda do Google. Contatos já existentes não são duplicados.
                  </p>
                </div>
                <Button
                  onClick={() => handleExportToGoogle()}
                  disabled={syncing || !account}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Upload size={14} className={syncing && actionType === 'export' ? 'animate-bounce' : ''} />
                  <span>{syncing && actionType === 'export' ? 'Salvando no Google...' : 'Salvar Clientes no Google'}</span>
                </Button>
              </div>

              {/* Botão Importar (Puxar do Google) */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <Download size={15} />
                    <span>Importar da Agenda do Google</span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Puxa os contatos da sua conta Google e insere na lista de Clientes do CRM, completando números ou e-mails vazios.
                  </p>
                </div>
                <Button
                  onClick={handleImportFromGoogle}
                  disabled={syncing || !account}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Download size={14} className={syncing && actionType === 'import' ? 'animate-bounce' : ''} />
                  <span>{syncing && actionType === 'import' ? 'Importando do Google...' : 'Puxar Contatos do Google'}</span>
                </Button>
              </div>
            </div>

            {/* Progresso durante a operação */}
            {syncing && (
              <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-primary-400">
                  <span className="flex items-center gap-2">
                    <RefreshCw size={13} className="animate-spin" /> {progressText}
                  </span>
                  {progressCount.total > 0 && (
                    <span className="font-mono">
                      {progressCount.current} / {progressCount.total}
                    </span>
                  )}
                </div>
                {progressCount.total > 0 && (
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${Math.round((progressCount.current / progressCount.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Resultado da Exportação */}
            {exportResult && !syncing && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Exportação para o Google Concluída!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] uppercase font-bold text-white/40">No Sistema</p>
                    <p className="text-sm font-black text-white font-mono">{exportResult.totalSystem}</p>
                  </div>
                  <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/20">
                    <p className="text-[9px] uppercase font-bold text-emerald-400">Salvos no Google</p>
                    <p className="text-sm font-black text-emerald-300 font-mono">+{exportResult.exported}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] uppercase font-bold text-white/40">Já Estavam Lá</p>
                    <p className="text-sm font-black text-white/70 font-mono">{exportResult.alreadyExisted}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] uppercase font-bold text-white/40">Sem Telefone</p>
                    <p className="text-sm font-black text-white/50 font-mono">{exportResult.skipped}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Resultado da Importação */}
            {importResult && !syncing && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Importação da Agenda Google Concluída!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] uppercase font-bold text-white/40">No Google</p>
                    <p className="text-sm font-black text-white font-mono">{importResult.totalGoogle}</p>
                  </div>
                  <div className="p-2 bg-blue-500/15 rounded-xl border border-blue-500/20">
                    <p className="text-[9px] uppercase font-bold text-blue-400">Novos Clientes</p>
                    <p className="text-sm font-black text-blue-300 font-mono">+{importResult.created}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] uppercase font-bold text-white/40">Atualizados</p>
                    <p className="text-sm font-black text-white/70 font-mono">{importResult.updated}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] uppercase font-bold text-white/40">Já em Dia</p>
                    <p className="text-sm font-black text-white/50 font-mono">{importResult.unchanged}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 2: GESTÃO DE CONTATOS & DUPLICADOS (LIMPEZA EM MASSA)      */}
        {/* ============================================================== */}
        {activeSubTab === 'contatos' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Alerta de Duplicados Encontrados */}
            {duplicateGroups.length > 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="text-amber-400 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-bold text-amber-300">
                      Encontramos {duplicateGroups.length} grupo(s) de contatos com números ou nomes repetidos!
                    </p>
                    <p className="text-[11px] text-white/50">
                      Você pode selecionar e excluir em massa ou unificar os cadastros abaixo.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSelectOnlyDuplicates}
                  className="text-[11px] font-bold shrink-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  Selecionar Duplicados
                </Button>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Nenhum contato duplicado detectado! Sua base de contatos está 100% limpa.</span>
              </div>
            )}

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar contato por nome, telefone ou e-mail..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-primary-500/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
                <button
                  onClick={() => setFilterMode('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                    filterMode === 'all' ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  Todos ({clients.length})
                </button>
                <button
                  onClick={() => setFilterMode('duplicates')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1",
                    filterMode === 'duplicates' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-white/40 hover:text-amber-300"
                  )}
                >
                  Duplicados ({duplicateIdsSet.size})
                </button>
                <button
                  onClick={() => setFilterMode('no_phone')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
                    filterMode === 'no_phone' ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                  )}
                >
                  Sem Telefone
                </button>
              </div>
            </div>

            {/* Barra de Ações em Massa (quando há seleção) */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-900/80 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllFiltered}
                  className="flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/5"
                >
                  {selectedClientIds.size === filteredClients.length && filteredClients.length > 0 ? (
                    <CheckSquare size={15} className="text-primary-400" />
                  ) : (
                    <Square size={15} className="text-white/40" />
                  )}
                  <span>Selecionar Todos ({filteredClients.length})</span>
                </button>

                {selectedClientIds.size > 0 && (
                  <Badge variant="outline" className="border-primary-500/30 text-primary-300 text-[10px] font-bold">
                    {selectedClientIds.size} selecionado(s)
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedClientIds.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        const selectedClientsList = clients.filter(c => selectedClientIds.has(c.id));
                        handleExportToGoogle(selectedClientsList);
                      }}
                      disabled={syncing || !account}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30"
                    >
                      <Upload size={12} className="mr-1" /> Salvar Selecionados no Google
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={deletingBatch}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20"
                    >
                      <Trash2 size={12} className="mr-1" />
                      {deletingBatch ? 'Excluindo...' : `Excluir em Massa (${selectedClientIds.size})`}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Grupos de Duplicados em Destaque */}
            {duplicateGroups.length > 0 && filterMode !== 'no_phone' && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <GitMerge size={12} /> Grupos de Duplicados Detectados (Clique em unificar para mesclar em um só)
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {duplicateGroups.map(group => (
                    <div key={group.key} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{group.label}</p>
                        <p className="text-[10px] text-white/50 truncate">
                          {group.clients.map(c => c.nome || c.full_name || 'Sem Nome').join(' • ')}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMergeGroup(group)}
                        disabled={mergingBatch}
                        className="text-[11px] font-bold text-amber-300 border-amber-500/30 hover:bg-amber-500/20 shrink-0"
                      >
                        <GitMerge size={12} className="mr-1" /> Unificar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabela de Contatos */}
            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
              <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                {loadingClients ? (
                  <div className="py-8 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-primary-400" />
                    <span>Carregando clientes...</span>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-white/40">
                    Nenhum contato encontrado com os filtros atuais.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-900 border-b border-white/10 text-white/50 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-3 w-8"></th>
                        <th className="p-3">Nome</th>
                        <th className="p-3">Telefone</th>
                        <th className="p-3">E-mail</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredClients.map(client => {
                        const isSelected = selectedClientIds.has(client.id);
                        const isDuplicate = duplicateIdsSet.has(client.id);
                        const name = client.nome || client.full_name || 'Contato sem Nome';
                        const phone = client.telefone || client.phone || '—';
                        const email = client.email || '—';

                        return (
                          <tr
                            key={client.id}
                            onClick={() => toggleSelectClient(client.id)}
                            className={cn(
                              "hover:bg-white/5 transition-colors cursor-pointer",
                              isSelected ? "bg-primary-500/10" : ""
                            )}
                          >
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => toggleSelectClient(client.id)}
                                className="cursor-pointer text-white/40 hover:text-white"
                              >
                                {isSelected ? (
                                  <CheckSquare size={15} className="text-primary-400" />
                                ) : (
                                  <Square size={15} />
                                )}
                              </button>
                            </td>
                            <td className="p-3 font-semibold text-white truncate max-w-[160px]">
                              {name}
                            </td>
                            <td className="p-3 text-white/70 font-mono text-[11px] truncate max-w-[130px]">
                              {phone}
                            </td>
                            <td className="p-3 text-white/50 truncate max-w-[150px]">
                              {email}
                            </td>
                            <td className="p-3 text-right">
                              {isDuplicate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Duplicado
                                </span>
                              ) : phone !== '—' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-400 bg-emerald-500/10">
                                  Pronto
                                </span>
                              ) : (
                                <span className="text-[10px] text-white/30">Sem tel</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rodapé com Fechar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-[10px] text-white/40">
            Google People API v1 • Sincronização Segura
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={syncing || deletingBatch || mergingBatch}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
