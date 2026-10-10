/**
 * "Campainha" do PIX: avisa o CRM quando chega e-mail novo do Nubank ("Você recebeu uma transferência pelo Pix").
 *
 * Roda no Google Apps Script, NA MESMA conta Gmail que recebe os avisos do Nubank (a do GMAIL_IMAP_USER).
 * Ele NÃO manda o conteúdo do e-mail: só toca a campainha. Quem confere remetente, DKIM/DMARC, valor e dá a baixa
 * na nota é o servidor (api/_lib/pagar-link.js -> api/_lib/pix-email.js).
 *
 * COMO INSTALAR (uma vez)
 *  1. Acesse script.google.com logado na conta do Gmail do Nubank > Novo projeto > cole este arquivo.
 *  2. Engrenagem "Configurações do projeto" > Propriedades do script > Adicionar:
 *       PIX_WEBHOOK_SECRET = <o MESMO valor da variável PIX_WEBHOOK_SECRET criada na Vercel>
 *       (nunca cole o segredo dentro do código)
 *  3. Ajuste URL_AVISO abaixo se o domínio do CRM mudar.
 *  4. Execute "verificarPixNubank" uma vez para autorizar o acesso ao Gmail e a chamada externa.
 *  5. Gatilhos (ícone de relógio) > Adicionar gatilho > função verificarPixNubank > Baseado em tempo >
 *     Timer por minuto > A cada minuto.
 *
 * COMO FUNCIONA
 *  - A cada minuto procura e-mails do Nubank mais novos que o último já avisado (guardado em propriedade do script).
 *  - Se não houver nenhum, termina na hora (não gasta Vercel nem Supabase).
 *  - Se houver, chama o CRM uma vez. O CRM responde { resolvido: true } quando terminou de conferir;
 *    só então o script avança o marcador. Se der erro ou vier resolvido:false, tenta de novo no minuto seguinte
 *    (no máximo MAX_TENTATIVAS vezes, para não insistir para sempre).
 */

var URL_AVISO = 'https://pro.rafaartsgraphics.com.br/api/ai?rota=pix-aviso';
var REMETENTE = 'todomundo@nubank.com.br';
var MAX_TENTATIVAS = 10;
var JANELA_BUSCA = 'newer_than:2d';

function verificarPixNubank() {
  var props = PropertiesService.getScriptProperties();
  var segredo = props.getProperty('PIX_WEBHOOK_SECRET');
  if (!segredo) throw new Error('Defina a propriedade PIX_WEBHOOK_SECRET em Propriedades do script.');

  // Primeira execução: começa "de agora", sem reprocessar e-mails antigos.
  var ultimoVisto = Number(props.getProperty('ULTIMO_VISTO_MS') || 0);
  if (!ultimoVisto) {
    props.setProperty('ULTIMO_VISTO_MS', String(Date.now()));
    return;
  }

  // O Gmail agrupa e-mails de mesmo assunto na mesma conversa; por isso o controle é por mensagem (data), não por rótulo.
  var conversas = GmailApp.search('from:' + REMETENTE + ' ' + JANELA_BUSCA, 0, 20);
  var maisNovo = ultimoVisto;
  var achou = false;
  for (var i = 0; i < conversas.length; i++) {
    var mensagens = conversas[i].getMessages();
    for (var j = 0; j < mensagens.length; j++) {
      var m = mensagens[j];
      var quando = m.getDate().getTime();
      if (quando <= ultimoVisto) continue;
      var texto = m.getSubject() + '\n' + m.getPlainBody();
      if (!/voc[eê]\s+recebeu\s+uma\s+transfer[eê]ncia\s+pelo\s+pix/i.test(texto)) {
        if (quando > maisNovo) maisNovo = quando; // e-mail do Nubank que não é Pix recebido: só avança o marcador
        continue;
      }
      achou = true;
      if (quando > maisNovo) maisNovo = quando;
    }
  }

  if (!achou) {
    if (maisNovo > ultimoVisto) props.setProperty('ULTIMO_VISTO_MS', String(maisNovo));
    return;
  }

  var chaveTentativas = 'TENTATIVAS_' + maisNovo;
  var tentativas = Number(props.getProperty(chaveTentativas) || 0) + 1;
  var resolvido = false;
  try {
    var resposta = UrlFetchApp.fetch(URL_AVISO, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-pix-secret': segredo },
      payload: JSON.stringify({ origem: 'apps-script' }),
      muteHttpExceptions: true,
    });
    if (resposta.getResponseCode() === 200) {
      var corpo = JSON.parse(resposta.getContentText() || '{}');
      resolvido = corpo.resolvido === true;
    } else {
      console.warn('CRM respondeu HTTP ' + resposta.getResponseCode());
    }
  } catch (err) {
    console.warn('Falha ao avisar o CRM: ' + err);
  }

  if (resolvido || tentativas >= MAX_TENTATIVAS) {
    props.setProperty('ULTIMO_VISTO_MS', String(maisNovo));
    props.deleteProperty(chaveTentativas);
  } else {
    props.setProperty(chaveTentativas, String(tentativas));
  }
}
