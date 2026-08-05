import React, { useEffect, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { MessageCircle, Instagram, Facebook, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { functions } from '../firebase';
import { Company } from '../types';

interface ChannelStatus {
  connected: boolean;
  isActive?: boolean;
  status?: string;
  accountName?: string;
  hasToken?: boolean;
}

type StatusMap = {
  whatsapp?: ChannelStatus;
  facebook?: ChannelStatus;
  instagram?: ChannelStatus;
};

const WEBHOOK_URL_HINT = 'https://us-central1-ninth-bonito-418201.cloudfunctions.net/metaWebhook';

export const IntegrationsSettings: React.FC<{ currentCompany: Company | null }> = ({ currentCompany }) => {
  const [status, setStatus] = useState<StatusMap>({});
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);

  // WhatsApp form
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waBusinessAccountId, setWaBusinessAccountId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');

  // Facebook / Instagram form (compartilham a Page)
  const [fbPageId, setFbPageId] = useState('');
  const [fbPageAccessToken, setFbPageAccessToken] = useState('');
  const [igBusinessAccountId, setIgBusinessAccountId] = useState('');

  const loadStatus = async () => {
    if (!currentCompany) return;
    setLoadingStatus(true);
    try {
      const fn = httpsCallable(functions, 'getChannelAccountsStatus');
      const res: any = await fn({ companyId: currentCompany.id });
      setStatus(res.data || {});
    } catch (err) {
      console.error('Erro ao consultar status das integrações:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id]);

  const saveWhatsApp = async () => {
    if (!currentCompany) return;
    setSavingChannel('whatsapp');
    try {
      const fn = httpsCallable(functions, 'saveChannelAccount');
      await fn({
        companyId: currentCompany.id,
        channelType: 'whatsapp',
        accountName: 'WhatsApp Business',
        whatsappPhoneNumberId: waPhoneNumberId || undefined,
        whatsappBusinessAccountId: waBusinessAccountId || undefined,
        whatsappAccessToken: waAccessToken || undefined,
      });
      setWaAccessToken('');
      await loadStatus();
      alert('Credenciais do WhatsApp salvas!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + (err?.message || 'tente novamente'));
    } finally {
      setSavingChannel(null);
    }
  };

  const saveFacebookAndInstagram = async (channel: 'facebook' | 'instagram') => {
    if (!currentCompany) return;
    setSavingChannel(channel);
    try {
      const fn = httpsCallable(functions, 'saveChannelAccount');
      await fn({
        companyId: currentCompany.id,
        channelType: channel,
        accountName: channel === 'facebook' ? 'Facebook Messenger' : 'Instagram Direct',
        facebookPageId: fbPageId || undefined,
        facebookPageAccessToken: fbPageAccessToken || undefined,
        instagramBusinessAccountId: channel === 'instagram' ? (igBusinessAccountId || undefined) : undefined,
      });
      setFbPageAccessToken('');
      await loadStatus();
      alert(`Credenciais do ${channel === 'facebook' ? 'Facebook Messenger' : 'Instagram'} salvas!`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao salvar: ' + (err?.message || 'tente novamente'));
    } finally {
      setSavingChannel(null);
    }
  };

  const StatusBadge = ({ ch }: { ch: keyof StatusMap }) => {
    if (loadingStatus) return <Loader2 size={14} className="animate-spin text-white/30" />;
    const s = status[ch];
    if (s?.connected) {
      return (
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
          <CheckCircle2 size={12} /> Configurado
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
        <XCircle size={12} /> Não configurado
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex gap-3 items-start">
        <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-200 space-y-1">
          <p className="font-bold">Antes de preencher aqui, você precisa criar um App em developers.facebook.com e configurar o Webhook lá com esta URL:</p>
          <code className="block bg-black/40 px-3 py-1.5 rounded-lg text-[11px] text-emerald-300 mt-1 select-all">{WEBHOOK_URL_HINT}</code>
          <p className="text-white/50 mt-1">Peça pro seu Claude Code / desenvolvedor o passo a passo completo se tiver dúvida em qualquer campo abaixo — cada token vem de um lugar diferente no painel da Meta.</p>
        </div>
      </div>

      {/* WHATSAPP */}
      <div className="space-y-4 p-6 bg-zinc-950 border border-emerald-500/20 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">WhatsApp (Cloud API)</h3>
              <p className="text-[10px] text-white/40">Não é o WhatsApp Business normal do celular — precisa da API oficial da Meta</p>
            </div>
          </div>
          <StatusBadge ch="whatsapp" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase">Phone Number ID</label>
            <input value={waPhoneNumberId} onChange={e => setWaPhoneNumberId(e.target.value)}
              className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 text-xs text-white outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase">WhatsApp Business Account ID</label>
            <input value={waBusinessAccountId} onChange={e => setWaBusinessAccountId(e.target.value)}
              className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 text-xs text-white outline-none" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-white/40 uppercase">Access Token (permanente, do System User)</label>
            <input type="password" value={waAccessToken} onChange={e => setWaAccessToken(e.target.value)}
              placeholder={status.whatsapp?.hasToken ? '•••••••• (já configurado — preencha só se for trocar)' : ''}
              className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 text-xs text-white outline-none" />
          </div>
        </div>
        <button onClick={saveWhatsApp} disabled={savingChannel === 'whatsapp'}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">
          {savingChannel === 'whatsapp' ? 'Salvando...' : 'Salvar WhatsApp'}
        </button>
      </div>

      {/* FACEBOOK MESSENGER */}
      <div className="space-y-4 p-6 bg-zinc-950 border border-blue-500/20 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
              <Facebook size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Facebook Messenger</h3>
              <p className="text-[10px] text-white/40">Precisa de uma Página do Facebook conectada ao App</p>
            </div>
          </div>
          <StatusBadge ch="facebook" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase">Page ID</label>
            <input value={fbPageId} onChange={e => setFbPageId(e.target.value)}
              className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 text-xs text-white outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/40 uppercase">Page Access Token</label>
            <input type="password" value={fbPageAccessToken} onChange={e => setFbPageAccessToken(e.target.value)}
              placeholder={status.facebook?.hasToken ? '•••••••• (já configurado)' : ''}
              className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 text-xs text-white outline-none" />
          </div>
        </div>
        <button onClick={() => saveFacebookAndInstagram('facebook')} disabled={savingChannel === 'facebook'}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">
          {savingChannel === 'facebook' ? 'Salvando...' : 'Salvar Facebook Messenger'}
        </button>
      </div>

      {/* INSTAGRAM */}
      <div className="space-y-4 p-6 bg-zinc-950 border border-pink-500/20 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center text-pink-400">
              <Instagram size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Instagram Direct</h3>
              <p className="text-[10px] text-white/40">Usa o mesmo Page Access Token do Facebook acima — a Página precisa estar vinculada ao Instagram Business</p>
            </div>
          </div>
          <StatusBadge ch="instagram" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-white/40 uppercase">Instagram Business Account ID</label>
            <input value={igBusinessAccountId} onChange={e => setIgBusinessAccountId(e.target.value)}
              className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-pink-500 rounded-xl px-3 text-xs text-white outline-none" />
          </div>
        </div>
        <p className="text-[10px] text-white/30">* Preencha o Page ID e o Page Access Token no bloco do Facebook acima antes de salvar — são compartilhados.</p>
        <button onClick={() => saveFacebookAndInstagram('instagram')} disabled={savingChannel === 'instagram'}
          className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">
          {savingChannel === 'instagram' ? 'Salvando...' : 'Salvar Instagram'}
        </button>
      </div>
    </div>
  );
};
