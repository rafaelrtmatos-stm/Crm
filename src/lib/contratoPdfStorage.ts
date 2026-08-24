// Sobe o PDF do contrato assinado pro Supabase Storage (bucket "contratos-assinados") e
// devolve a URL publica pra guardar em contratos.pdf_url.
//
// Chamado UMA UNICA VEZ, dentro de signContract() (otpUtils.ts), logo apos o contrato virar
// status='assinado'. A partir dai esse arquivo e' A FONTE DA VERDADE: qualquer download
// posterior (painel Admin ou tela publica /assinar/:id) deve puxar essa URL em vez de gerar
// o PDF de novo no navegador -- assim o arquivo baixado permanece byte-a-byte identico ao que
// foi assinado, mesmo que o layout/fonte da geracao mude no futuro.
// Ver contexto completo em supabase/add_pdf_url_contratos.sql.

import { supabase } from '../supabase';
import { generateContratoPdfBlob, contratoPdfFileName, type AuditStamp } from './contratoPdf';

const BUCKET = 'contratos-assinados';

/**
 * Gera o PDF assinado (com o carimbo de auditoria) e sobe pro Storage.
 * Path do arquivo = id do contrato, pra ficar unico e estavel mesmo se numero/cliente mudarem
 * de nome depois (o arquivo em si nao muda, so a URL publica que aponta pra ele).
 * Retorna a URL publica em caso de sucesso, ou null se der erro (nao deve interromper o fluxo
 * de assinatura, que ja foi confirmado no banco antes dessa chamada).
 */
export async function uploadContratoPdfAssinado(
  contractId: string,
  numero: string,
  customerName: string,
  textoContrato: string,
  auditStamp: AuditStamp
): Promise<{ url: string | null; pdfHash: string | null }> {
  try {
    const blob = await generateContratoPdfBlob(numero, textoContrato, auditStamp);
    const path = `${contractId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error('Erro ao subir PDF assinado pro Storage:', uploadError);
      return { url: null, pdfHash: null };
    }

    // SHA-256 dos BYTES do arquivo PDF final (diferente de document_hash, que e' do TEXTO do
    // contrato) -- permite que a pagina publica /validar confira um PDF enviado pelo usuario
    // contra o que foi efetivamente gerado/assinado, sem precisar reabrir o contrato.
    const pdfBuffer = await blob.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', pdfBuffer);
    const pdfHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path, {
      download: contratoPdfFileName(numero, customerName),
    });

    return { url: data?.publicUrl || null, pdfHash };
  } catch (err) {
    console.error('Erro ao gerar/subir PDF assinado:', err);
    return { url: null, pdfHash: null };
  }
}
