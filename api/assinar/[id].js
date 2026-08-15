// Endpoint acionado SOMENTE para crawlers de redes sociais (WhatsApp, Instagram,
// Telegram, Facebook, etc.) quando eles abrem o link /assinar/:id enviado ao cliente
// pra gerar o preview da mensagem. Veja o roteamento condicional (por User-Agent) em
// vercel.json — usuários reais (navegador) nunca passam por aqui, vão direto pro SPA
// (index.html), que é quem realmente renderiza a tela de assinatura
// (ContractSignaturePublicPage.tsx).
//
// Aqui a gente só busca os dados do contrato no Supabase (número, nome do cliente,
// valor) e a logo da empresa (tabela configuracoes) e devolve um HTML minúsculo com
// as meta tags og:title / og:description / og:image, que é o que WhatsApp/Instagram/
// Telegram leem pra montar o card de preview.

// Mesmo projeto/chave pública (anon/publishable) já usados no app em src/supabase.ts —
// seguro expor, é a chave pensada pra rodar no navegador.
const SUPABASE_URL = 'https://areqouezrbdubfutjzki.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YbzFXDHWQy-k0F9uNtVJ2g_urcsgmVt';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  const id = req.query.id;
  const siteUrl = `https://${req.headers.host}`;
  // ?direct=1 sinaliza que já estamos na segunda etapa (pós meta-refresh) — o rewrite
  // condicional em vercel.json ignora essa URL e deixa cair direto no SPA, evitando loop.
  const pageUrl = `${siteUrl}/assinar/${encodeURIComponent(id || '')}?direct=1`;

  let numero = '';
  let customerName = 'Cliente';
  let total = 0;
  let logoUrl = `${siteUrl}/icon-512.png`; // fallback: ícone do próprio app

  try {
    if (id) {
      const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      };

      const [contratoRes, configRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/contratos?id=eq.${encodeURIComponent(id)}&select=numero,customer_name,total`,
          { headers }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/configuracoes?select=logo_light_url,logo_dark_url&limit=1`,
          { headers }
        ),
      ]);

      if (contratoRes.ok) {
        const contratoData = await contratoRes.json();
        if (Array.isArray(contratoData) && contratoData[0]) {
          numero = contratoData[0].numero || '';
          customerName = contratoData[0].customer_name || customerName;
          total = Number(contratoData[0].total) || 0;
        }
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        if (Array.isArray(configData) && configData[0]) {
          logoUrl = configData[0].logo_light_url || configData[0].logo_dark_url || logoUrl;
        }
      }
    }
  } catch (err) {
    console.error('Erro ao buscar dados do contrato para preview OG:', err);
  }

  const valorFormatado = total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const title = numero ? `Contrato ${numero} — ${customerName}` : `Contrato — ${customerName}`;
  const description = `Segue o contrato${numero ? ' ' + numero : ''} no valor de R$ ${valorFormatado}. Acesse para conferir os detalhes e assinar.`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache curto na CDN da Vercel: o preview do WhatsApp já fica em cache no lado deles,
  // então não precisa recalcular a cada request, mas também não trava por muito tempo
  // se o valor/numero do contrato mudar.
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website" />
<meta property="og:url" content="${escapeHtml(pageUrl)}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(logoUrl)}" />
<meta property="og:site_name" content="Rafa Arts Graphics" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(logoUrl)}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(pageUrl)}" />
</head>
<body>
<p>Redirecionando para o contrato... <a href="${escapeHtml(pageUrl)}">Clique aqui</a></p>
</body>
</html>`);
}
