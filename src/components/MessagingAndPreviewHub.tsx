import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Check, 
  Copy, 
  Share2, 
  Phone, 
  Eye, 
  FileText, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink,
  Bot,
  Globe,
  BellRing
} from 'lucide-react';
import { CompanyConfig, PdfCustomization, SocialChannelTemplate } from '../types';

interface MessagingAndPreviewHubProps {
  companyConfig: CompanyConfig;
  pdfConfig: PdfCustomization;
  contractText?: string;
}

export const DEFAULT_TEMPLATES: SocialChannelTemplate[] = [
  {
    id: 'tmpl-1',
    channel: 'whatsapp',
    type: 'orcamento',
    title: 'Modelo - Proposta de Orçamento',
    messageText: 'Olá {{NOME}}! Segue o contrato {{NUMERO}} no valor de R$ {{VALOR}}.\n\nAcesse o link para conferir os detalhes e assinar: {{LINK_CONTRATO}}'
  },
  {
    id: 'tmpl-2',
    channel: 'whatsapp',
    type: 'confirmacao_aceite',
    title: 'Modelo - Código de Confirmação (Cláusula 8)',
    messageText: '{{EMPRESA}}: Seu código de verificação para aceite eletrônico do contrato é: *{{CODIGO}}*. Informe no sistema para validar a assinatura jurídica.'
  },
  {
    id: 'tmpl-3',
    channel: 'instagram',
    type: 'pagamento_confirmado',
    title: 'Modelo Instagram - Pagamento Confirmado',
    messageText: 'Fala {{NOME}}! Confirmamos o pagamento da sua entrada de R$ {{ENTRADA}} no PIX. A produção do seu material já foi iniciada com o prazo de {{PRAZO}} dias úteis! 🚀'
  },
  {
    id: 'tmpl-4',
    channel: 'telegram',
    type: 'aviso_entrega',
    title: 'Modelo Telegram - Serviço Pronto para Retirada',
    messageText: '🔔 {{NOME}}, seu serviço ("{{SERVICO}}") está PRONTO para retirada em nossa loja ou envio! Aguardamos você em {{ENDERECO}}.'
  },
  {
    id: 'tmpl-5',
    channel: 'facebook',
    type: 'orcamento',
    title: 'Modelo Facebook Messenger - Recepção de Lead',
    messageText: 'Olá {{NOME}}, recebemos seu pedido de orçamento via Facebook! Nosso vendedor já está preparando a proposta gráfica ideal para você.'
  }
];

export const MessagingAndPreviewHub: React.FC<MessagingAndPreviewHubProps> = ({
  companyConfig,
  pdfConfig,
  contractText
}) => {
  const [activeTab, setActiveTab] = useState<'preview_pdf' | 'preview_social' | 'templates'>('preview_pdf');
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'instagram' | 'facebook' | 'telegram'>('whatsapp');
  
  // Test message parameters
  const [clientName, setClientName] = useState('Daiane de Aguiar Neres');
  const [contractNumber, setContractNumber] = useState('CTR-241359');
  const [serviceTitle, setServiceTitle] = useState('Fachada ACM 3x1m LED');
  const [totalValue, setTotalValue] = useState(2140);
  const [verificationCode, setVerificationCode] = useState('849201');
  const [selectedTemplateType, setSelectedTemplateType] = useState<'orcamento' | 'confirmacao_aceite' | 'pagamento_confirmado' | 'aviso_entrega'>('orcamento');

  const [copiedMessageAlert, setCopiedMessageAlert] = useState(false);

  // Link real do contrato: mesma rota pública usada pelo cliente pra ler e assinar
  // (ver ContractSignaturePublicPage / rota /assinar/:id em AppRoot.tsx, e
  // PUBLIC_BASE_URL em ContractSignatureOtpPanel.tsx)
  const CONTRATO_LINK = `https://pro.rafaartsgraphics.com.br/assinar/${contractNumber}`;

  // Formatted message preview text generator
  const getFormattedMessage = (channel: string, type: string) => {
    const tmpl = DEFAULT_TEMPLATES.find(t => t.channel === channel && t.type === type) || DEFAULT_TEMPLATES[1];
    let txt = tmpl.messageText;
    txt = txt.replace(/{{NOME}}/g, clientName);
    txt = txt.replace(/{{EMPRESA}}/g, companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS');
    txt = txt.replace(/{{NUMERO}}/g, contractNumber);
    txt = txt.replace(/{{SERVICO}}/g, serviceTitle);
    txt = txt.replace(/{{VALOR}}/g, totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    txt = txt.replace(/{{ENTRADA}}/g, (totalValue / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    txt = txt.replace(/{{CODIGO}}/g, verificationCode);
    txt = txt.replace(/{{LINK_CONTRATO}}/g, CONTRATO_LINK);
    txt = txt.replace(/{{PRAZO}}/g, '7');
    txt = txt.replace(/{{ENDERECO}}/g, companyConfig.endereco || 'Av. T-63, nº 1200 - Goiânia/GO');
    return txt;
  };

  // A mensagem atual leva o link do contrato? (só o modelo de orçamento tem {{LINK_CONTRATO}})
  const currentMessageHasContractLink = (channel: string, type: string) => {
    const tmpl = DEFAULT_TEMPLATES.find(t => t.channel === channel && t.type === type) || DEFAULT_TEMPLATES[1];
    return tmpl.messageText.includes('{{LINK_CONTRATO}}');
  };

  // Dados do card de preview do link (o que WhatsApp/Instagram/Telegram mostram
  // ao colar um link: logo da empresa, nome do cliente e valor do contrato)
  const getContractLinkPreview = () => ({
    logoUrl: companyConfig.logoUrl,
    empresa: companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS',
    titulo: clientName,
    valorFormatado: `Contrato ${contractNumber} • R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    url: CONTRATO_LINK.replace(/^https?:\/\//, ''),
  });

  const handleCopyMessage = () => {
    const text = getFormattedMessage(activeChannel, selectedTemplateType);
    navigator.clipboard.writeText(text);
    setCopiedMessageAlert(true);
    setTimeout(() => setCopiedMessageAlert(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="p-6 bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950 border border-red-500/30 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Eye className="text-red-500" size={22} />
            <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
              Painel de Pré-visualização & Integração de Mensageria
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Simule como o PDF do contrato e as mensagens das redes sociais (WhatsApp, Instagram, Facebook, Telegram) vão aparecer para o cliente
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-zinc-950 p-1.5 border border-zinc-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('preview_pdf')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'preview_pdf' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText size={14} />
            <span>PDF do Contrato</span>
          </button>

          <button
            onClick={() => setActiveTab('preview_social')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'preview_social' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>Redes Sociais</span>
          </button>
        </div>
      </div>

      {/* Tab Content 1: PDF Document Preview */}
      {activeTab === 'preview_pdf' && (
        <div className="bg-zinc-950 border border-red-500/20 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={18} className="text-red-500" />
                Visualização do Documento PDF com Regras do Contrato
              </h3>
              <p className="text-[10px] text-zinc-400">
                Modelo impresso com logo e cores configuradas ({pdfConfig.primaryColor})
              </p>
            </div>
            <span className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-bold">
              Cláusula 8 (Aceite Eletrônico Integrado)
            </span>
          </div>

          {/* Rendered Sheet Mock */}
          <div className="max-w-3xl mx-auto bg-white text-zinc-900 rounded-2xl p-8 shadow-2xl border-2 border-red-600 relative space-y-5 font-sans">
            {/* Header */}
            <div className="text-center border-b-2 border-red-600 pb-4">
              {companyConfig.logoUrl && (
                <img 
                  src={companyConfig.logoUrl} 
                  alt="Logo" 
                  className="h-14 object-contain mx-auto mb-2" 
                />
              )}
              <h1 className="text-base font-black text-red-600 uppercase tracking-tight">
                {companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS'}
              </h1>
              <p className="text-[10px] text-zinc-600 font-semibold">
                CNPJ: {companyConfig.cnpj} • Endereço: {companyConfig.endereco}
              </p>
            </div>

            {/* Contract Title */}
            <div className="text-center py-2 bg-red-50 border border-red-200 rounded-xl">
              <h2 className="text-xs font-black text-red-700 uppercase">
                CONTRATO DE PRESTAÇÃO DE SERVIÇOS
              </h2>
            </div>

            {/* Document Body */}
            <div className="text-[11px] leading-relaxed space-y-3 text-zinc-800">
              <p>
                <strong>CONTRATANTE:</strong> {clientName}, brasileiro, solteiro, comerciante, portador do CPF nº 123.456.789-00 e RG nº 12.345.678-9 DG/GO, residente na Rua das Flores, Goiânia - GO.
              </p>
              <p>
                <strong>CONTRATADA:</strong> {companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS'}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {companyConfig.cnpj || '28.884.125/0001-40'}.
              </p>
              <p>
                <strong>CLÁUSULA 1ª – DO OBJETO:</strong> 1.1. Prestação dos serviços: {serviceTitle}.
              </p>
              <p>
                <strong>CLÁUSULA 3ª – DO VALOR E FORMA DE PAGAMENTO:</strong> 3.1. Valor total de R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. 3.2. Entrada de 50% (R$ {(totalValue / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) + Saldo de 50% (R$ {(totalValue / 2).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) na entrega.
              </p>
              <div className="p-3 bg-zinc-50 border-l-4 border-red-600 text-[10px]">
                <strong>CLÁUSULA 8ª – DA VALIDADE DA ASSINATURA E DO ACEITE ELETRÔNICO:</strong>
                <p className="mt-1">
                  8.1. Nos termos do art. 107 do Código Civil, Lei nº 14.063/2020 e MP nº 2.200-2/2001, é plenamente válido o aceite manifestado com verificação via código de segurança WhatsApp.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-zinc-200 text-center text-[9px] text-zinc-500">
              Comarca do Foro eleita: {companyConfig.cidadeForo || 'Goiânia - GO'} • Data: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Multi-channel Social Messaging Preview */}
      {activeTab === 'preview_social' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls & Channel Switcher */}
          <div className="lg:col-span-5 bg-zinc-950 border border-red-500/20 rounded-3xl p-6 space-y-5">
            <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
              <Bot size={16} />
              Configurar Simulação de Mensagem
            </h3>

            {/* Channel Buttons */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-zinc-400">
                Selecione a Rede Social / Canal
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'whatsapp', label: 'WhatsApp', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20' },
                  { id: 'instagram', label: 'Instagram Direct', color: 'border-pink-500/40 text-pink-400 bg-pink-950/20' },
                  { id: 'facebook', label: 'FB Messenger', color: 'border-blue-500/40 text-blue-400 bg-blue-950/20' },
                  { id: 'telegram', label: 'Telegram', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20' }
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChannel(c.id as any)}
                    className={`p-3 rounded-2xl border text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
                      activeChannel === c.id 
                        ? `${c.color} border-2 shadow-lg` 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Type Selector */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-[10px] font-black uppercase text-zinc-400">
                Tipo de Mensagem / Status
              </label>
              <div className="space-y-2">
                {[
                  { id: 'orcamento', label: '1. Envio de Proposta de Orçamento' },
                  { id: 'confirmacao_aceite', label: '2. Envio de Código de Confirmação (Cláusula 8)' },
                  { id: 'pagamento_confirmado', label: '3. Aviso de Pagamento da Entrada Confirmado' },
                  { id: 'aviso_entrega', label: '4. Aviso de Serviço Pronto para Retirada' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateType(t.id as any)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border transition-all ${
                      selectedTemplateType === t.id 
                        ? 'bg-red-600/20 border-red-500 text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Variables Form */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Nome do Cliente</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Número do Contrato</label>
                <input
                  type="text"
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                  className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Valor Total (R$)</label>
                  <input
                    type="number"
                    value={totalValue}
                    onChange={e => setTotalValue(Number(e.target.value))}
                    className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Código OTP</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyMessage}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950 transition-all"
            >
              {copiedMessageAlert ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedMessageAlert ? 'Copiado para a Área de Transferência!' : 'Copiar Texto da Mensagem'}</span>
            </button>
          </div>

          {/* Smartphone Mockup Phone Screen */}
          <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase text-zinc-300 flex items-center gap-2">
                <Smartphone size={16} className="text-red-500" />
                Simulação da Interface de Mensageria ({activeChannel.toUpperCase()})
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
                Visualização do Cliente
              </span>
            </div>

            {/* Phone Screen Outer Frame */}
            <div className="w-full max-w-[340px] bg-zinc-950 border-4 border-zinc-800 rounded-[36px] shadow-2xl p-4 overflow-hidden relative min-h-[520px] flex flex-col justify-between">
              {/* Phone Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-zinc-400 px-2 pb-2 border-b border-zinc-800/80">
                <span>09:41</span>
                <span className="font-bold text-red-500">
                  {companyConfig.razaoSocial || 'RAFA ARTS'}
                </span>
                <span>100% 🔋</span>
              </div>

              {/* Chat Message Box Bubble */}
              <div className="flex-1 py-4 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="text-center text-[9px] text-zinc-500 uppercase font-bold">Hoje</div>

                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-2xl text-xs text-white space-y-2 shadow-lg">
                  <div className="flex items-center justify-between border-b border-red-500/20 pb-1 text-[9px] text-red-400 font-bold">
                    <span>{companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS'}</span>
                    <span>Mensagem Oficial</span>
                  </div>

                  <p className="whitespace-pre-line text-[11px] leading-relaxed text-zinc-200">
                    {getFormattedMessage(activeChannel, selectedTemplateType)}
                  </p>

                  {/* Preview do link do contrato — reproduz o card que o WhatsApp/Instagram/
                      Telegram geram automaticamente ao detectar um link na mensagem */}
                  {currentMessageHasContractLink(activeChannel, selectedTemplateType) && (
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
                      <div className="h-24 w-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                        {getContractLinkPreview().logoUrl ? (
                          <img
                            src={getContractLinkPreview().logoUrl}
                            alt={getContractLinkPreview().empresa}
                            className="max-h-full max-w-full object-contain p-3"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-zinc-500">
                            <FileText size={22} />
                            <span className="text-[8px] font-black uppercase tracking-wider">
                              {getContractLinkPreview().empresa}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 space-y-0.5 bg-zinc-950/60">
                        <p className="text-[10px] font-black text-white leading-tight truncate">
                          {getContractLinkPreview().titulo}
                        </p>
                        <p className="text-[9px] text-zinc-300 leading-tight">
                          {getContractLinkPreview().valorFormatado}
                        </p>
                        <p className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">
                          {getContractLinkPreview().url}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-right text-[8px] text-zinc-400 font-mono">
                    09:41 ✓✓
                  </div>
                </div>
              </div>

              {/* Phone Footer Action Bar */}
              <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 text-[10px] text-zinc-500">
                  Responder ao atendimento...
                </div>
                <div className="p-2 bg-red-600 rounded-full text-white">
                  <Send size={12} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
