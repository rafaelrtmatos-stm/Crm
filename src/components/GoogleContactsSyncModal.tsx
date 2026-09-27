import React, { useState, useEffect } from 'react';
import { 
  Users, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Download, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import { Modal, Button, Badge, GoogleLogo, cn } from './SharedUI';
import { 
  getSavedGoogleAccount, 
  connectGoogleContacts, 
  disconnectGoogleContacts, 
  syncGoogleContactsWithDatabase, 
  GoogleConnectedAccount, 
  GoogleSyncResult 
} from '../lib/googleContacts';
import { showAlert } from '../lib/notify';

interface GoogleContactsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (result: GoogleSyncResult) => void;
  companyId?: string | null;
}

export const GoogleContactsSyncModal: React.FC<GoogleContactsSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  companyId = 'rafa-arts',
}) => {
  const [account, setAccount] = useState<GoogleConnectedAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressCount, setProgressCount] = useState({ current: 0, total: 0 });
  const [syncResult, setSyncResult] = useState<GoogleSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccount(getSavedGoogleAccount());
      setSyncResult(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { accessToken } = await connectGoogleContacts();
      const acc = getSavedGoogleAccount();
      setAccount(acc);
      // Dispara a sincronização diretamente com o token obtido
      await triggerSyncWithToken(accessToken);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        const msg = err.message || 'Falha ao autenticar com o Google.';
        setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleContacts();
      setAccount(null);
      setSyncResult(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const triggerSyncWithToken = async (overrideToken?: string) => {
    setSyncing(true);
    setErrorMessage(null);
    setSyncResult(null);
    setProgressText('Iniciando sincronização...');
    setProgressCount({ current: 0, total: 0 });

    try {
      const res = await syncGoogleContactsWithDatabase(
        companyId,
        (curr, tot, text) => {
          setProgressCount({ current: curr, total: tot });
          setProgressText(text);
        },
        overrideToken
      );
      setSyncResult(res);
      setAccount(getSavedGoogleAccount());
      onSyncComplete?.(res);
    } catch (err: any) {
      console.error('Erro na sincronização Google Contatos:', err);
      let msg = err.message || 'Falha ao sincronizar com Google Contatos.';
      if (typeof msg !== 'string') {
        try {
          msg = JSON.stringify(msg);
        } catch {
          msg = 'Falha ao sincronizar com Google Contatos.';
        }
      }
      setErrorMessage(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    await triggerSyncWithToken();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!syncing) onClose();
      }}
      title="Sincronização Google Contatos"
      className="w-full max-w-[calc(100vw-24px)] sm:max-w-[480px] mx-auto p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Descrição e Explicação */}
        <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <GoogleLogo className="w-5 h-5" />
          </div>
          <div className="text-xs text-white/70 leading-relaxed space-y-1">
            <p className="font-bold text-white">Importe e mantenha seus clientes em dia</p>
            <p className="text-[11px] text-white/50">
              Conecte sua conta do Google para importar contatos direto para a lista de Clientes do CRM.
              Contatos existentes são atualizados com dados faltantes (sem duplicar).
            </p>
          </div>
        </div>

        {/* Estado da Conexão */}
        {account ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {account.photoUrl ? (
                  <img src={account.photoUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-white/20 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{account.name}</p>
                  <p className="text-[10px] text-emerald-400 font-mono truncate">{account.email}</p>
                </div>
              </div>
              <Badge variant="success" className="text-[9px] uppercase font-black shrink-0">
                Conectado
              </Badge>
            </div>

            {account.lastSyncAt && (
              <p className="text-[10px] text-white/40 pt-1 border-t border-white/5">
                Última sincronização: {new Date(account.lastSyncAt).toLocaleString('pt-BR')}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={syncing}
                className="text-[10px] font-bold text-white/40 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut size={12} /> Desconectar conta
              </button>

              <button
                type="button"
                onClick={handleConnect}
                disabled={syncing}
                className="text-[10px] font-bold text-white/50 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Trocar conta
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <GoogleLogo className="w-4 h-4" />
              <span>{loading ? 'Conectando ao Google...' : 'Conectar com Conta Google'}</span>
            </Button>
            <p className="text-[10px] text-white/40 flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              Acesso seguro somente-leitura aos seus contatos
            </p>
          </div>
        )}

        {/* Em progresso de Sincronização */}
        {syncing && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-center animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-primary-400 font-bold text-xs">
              <RefreshCw size={14} className="animate-spin" />
              <span>Sincronizando...</span>
            </div>
            <p className="text-[11px] text-white/60">{progressText}</p>
            {progressCount.total > 0 && (
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-2">
                <div 
                  className="bg-primary-500 h-full transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.round((progressCount.current / progressCount.total) * 100))}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Ocorreu um erro:</p>
              <p className="text-[11px] opacity-90">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Resultado da Sincronização */}
        {syncResult && !syncing && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 size={16} />
              <span>Sincronização Finalizada</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[9px] uppercase font-bold text-white/40">No Google</p>
                <p className="text-sm font-black text-white font-mono">{syncResult.totalGoogle}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-[9px] uppercase font-bold text-emerald-400">Novos</p>
                <p className="text-sm font-black text-emerald-300 font-mono">+{syncResult.created}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-[9px] uppercase font-bold text-blue-400">Atualizados</p>
                <p className="text-sm font-black text-blue-300 font-mono">{syncResult.updated}</p>
              </div>
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[9px] uppercase font-bold text-white/40">Já em Dia</p>
                <p className="text-sm font-black text-white/70 font-mono">{syncResult.unchanged}</p>
              </div>
            </div>

            {syncResult.skipped > 0 && (
              <p className="text-[10px] text-white/40 text-center">
                {syncResult.skipped} contato(s) sem telefone nem e-mail foram ignorados.
              </p>
            )}

            {syncResult.errors.length > 0 && (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <p className="font-bold">Avisos:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {syncResult.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {syncResult.errors.length > 3 && (
                    <li>... e mais {syncResult.errors.length - 3} avisos</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={syncing}
            className="text-xs"
          >
            Fechar
          </Button>

          {account && (
            <Button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="bg-primary-500 hover:bg-primary-400 text-slate-900 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-primary-500/20"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
