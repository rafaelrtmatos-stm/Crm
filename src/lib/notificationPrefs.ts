// Preferências de notificação de mensagens deste DISPOSITIVO (ficam no navegador, não no banco).
// Servem pra cada pessoa ajustar o próprio aparelho: o celular pode ficar sem som e o computador do balcão com tudo ligado.
// Grupo silenciado (sino na conversa) continua valendo por cima: nunca avisa, qualquer que seja a preferência.
export interface NotificationPrefs {
  som: boolean;                 // toca o som quando chega mensagem nova
  avisoTela: boolean;           // card de aviso no canto da tela (CRM aberto e em foco)
  notificacaoNavegador: boolean; // notificação nativa do navegador/celular (CRM em segundo plano)
}

const CHAVE = 'rpro_notif_prefs';
const PADRAO: NotificationPrefs = { som: true, avisoTela: true, notificacaoNavegador: true };

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { ...PADRAO };
    const p = JSON.parse(bruto);
    return {
      som: p?.som !== false,
      avisoTela: p?.avisoTela !== false,
      notificacaoNavegador: p?.notificacaoNavegador !== false,
    };
  } catch {
    return { ...PADRAO };
  }
}

export function setNotificationPrefs(prefs: NotificationPrefs): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(prefs)); } catch { /* ignora */ }
}
