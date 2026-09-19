// Reprocessa transcrições de áudio que ficaram pendentes numa conversa (CRM estava fechado quando
// o áudio chegou, ou o provedor falhou temporariamente). Chamado pelo front-end ao abrir o chat.
//
// POST /api/transcrever-pendentes
// headers: x-user-id: <id do usuário logado>
// body: { phone: "5511999999999" }
import { exigirUsuarioAutorizado } from './_lib/auth.js';
import { processarPendentesDoTelefone } from './_lib/transcricao-fila.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!(await exigirUsuarioAutorizado(req, res))) return;

  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  if (!phone) {
    res.status(400).json({ error: 'Telefone inválido.' });
    return;
  }
  const resultados = await processarPendentesDoTelefone(phone);
  res.status(200).json({ processados: resultados.length, resultados });
}
