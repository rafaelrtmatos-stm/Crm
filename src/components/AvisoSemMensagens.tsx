import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '../supabase';

// Aviso vermelho no topo do CRM quando o WhatsApp parece ter parado de receber mensagens.
// Motivo: a sessão da Evolution às vezes fica "Conectada" sem receber nada, e ninguém percebia por horas.
// Regra: em horário comercial (8h–19h, Santarém), se a última mensagem RECEBIDA tem mais de 60 min, avisa.
const LIMITE_MINUTOS = 60;
const HORA_INICIO = 8;
const HORA_FIM = 19;
const CHECAR_A_CADA_MS = 2 * 60 * 1000;
const SILENCIAR_MS = 30 * 60 * 1000;

function horaEmSantarem(): number {
  const h = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem', hour: 'numeric', hour12: false }).format(new Date());
  return Number(h) % 24;
}

export function AvisoSemMensagens() {
  const [minutos, setMinutos] = useState<number | null>(null);
  const [silenciadoAte, setSilenciadoAte] = useState(0);

  useEffect(() => {
    let ativo = true;
    const checar = async () => {
      const hora = horaEmSantarem();
      if (hora < HORA_INICIO || hora >= HORA_FIM) { if (ativo) setMinutos(null); return; }
      try {
        const { data, error } = await supabase
          .from('crm_messages')
          .select('created_at')
          .eq('direction', 'incoming')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error || !ativo) return;
        const ultima = data?.[0]?.created_at ? new Date(data[0].created_at).getTime() : 0;
        const min = ultima ? Math.floor((Date.now() - ultima) / 60000) : null;
        setMinutos(min !== null && min >= LIMITE_MINUTOS ? min : null);
      } catch {
        // sem internet / erro de consulta: não mostra aviso falso
      }
    };
    checar();
    const id = setInterval(checar, CHECAR_A_CADA_MS);
    return () => { ativo = false; clearInterval(id); };
  }, []);

  if (minutos === null || Date.now() < silenciadoAte) return null;

  const tempo = minutos >= 120 ? `${Math.floor(minutos / 60)}h` : `${minutos} min`;
  return (
    <div role="alert" className="flex items-start gap-2 bg-red-600 text-white text-sm px-4 py-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="flex-1">
        Sem mensagens recebidas no WhatsApp há {tempo}. A conexão pode ter caído: reconecte o número pela página da Evolution (QR code).
      </p>
      <button type="button" aria-label="Silenciar por 30 minutos" onClick={() => setSilenciadoAte(Date.now() + SILENCIAR_MS)} className="shrink-0 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
