import React, { useState } from 'react';
import { Palette, Layout, Type, Image as ImageIcon, Printer, Download, Eye, RotateCcw, Check, FileText } from 'lucide-react';
import { PdfCustomization, CompanyConfig } from '../types';

interface PdfTemplateEditorProps {
  companyConfig: CompanyConfig;
  pdfConfig: PdfCustomization;
  onSavePdfConfig: (config: PdfCustomization) => void;
  sampleContractText?: string;
}

export const DEFAULT_PDF_CONFIG: PdfCustomization = {
  primaryColor: '#dc2626', // Red
  secondaryColor: '#000000', // Black
  backgroundColor: '#ffffff', // White
  logoPosition: 'center',
  logoScale: 100,
  fontFamily: 'sans',
  headerText: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE COMUNICAÇÃO VISUAL',
  footerText: 'RAFA ARTS GRAPHICS • CNPJ 28.884.125/0001-40 • Validade Jurídica Eletrônica (Lei 14.063/2020)',
  showWatermark: true
};

export const PdfTemplateEditor: React.FC<PdfTemplateEditorProps> = ({
  companyConfig,
  pdfConfig,
  onSavePdfConfig,
  sampleContractText
}) => {
  const [config, setConfig] = useState<PdfCustomization>({
    ...DEFAULT_PDF_CONFIG,
    ...pdfConfig
  });
  const [savedAlert, setSavedAlert] = useState(false);

  const handleSave = () => {
    onSavePdfConfig(config);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 2000);
  };

  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoHtml = companyConfig.logoUrl ? `
      <div style="text-align: ${config.logoPosition}; margin-bottom: 20px;">
        <img src="${companyConfig.logoUrl}" style="max-height: ${Math.round(80 * (config.logoScale / 100))}px; object-fit: contain;" alt="Logo" />
      </div>
    ` : '';

    const fontStyleCss = config.fontFamily === 'mono' ? 'font-family: monospace;' :
                         config.fontFamily === 'serif' ? 'font-family: Georgia, serif;' :
                         config.fontFamily === 'display' ? 'font-family: "Playfair Display", serif;' :
                         'font-family: Arial, sans-serif;';

    const textToPrint = sampleContractText || `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: Carlos Alberto Oliveira, brasileiro, solteiro, comerciante, portador do CPF nº 123.456.789-00 e RG nº 12.345.678-9 DG/GO, residente na Rua das Flores, Qd 12, Lt 05 - Goiânia/GO.

CONTRATADA: ${companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS'}, CNPJ ${companyConfig.cnpj || '28.884.125/0001-40'}.

CLÁUSULA 1ª – DO OBJETO
1.1. Serviços de comunicação visual: Confecção de Fachada em ACM 3x1m com Letras Caixa em LED.

CLÁUSULA 3ª – DO VALOR
3.1. R$ 3.800,00 (três mil e oitocentos reais).
3.2. Entrada de 50% (R$ 1.900,00) + Saldo de 50% (R$ 1.900,00) na entrega.

CLÁUSULA 8ª – DA VALIDADE DA ASSINATURA ELETRÔNICA
8.1. Aceite eletrônico nos termos da MP 2.200-2/2001 e Lei 14.063/2020.`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Contrato - ${companyConfig.razaoSocial || 'Rafa Arts Graphics'}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            background-color: ${config.backgroundColor};
            color: #111827;
            ${fontStyleCss}
            line-height: 1.6;
            margin: 0;
            padding: 20px;
          }
          .pdf-container {
            border: 2px solid ${config.primaryColor};
            padding: 30px;
            position: relative;
            min-height: 900px;
          }
          .pdf-header {
            border-bottom: 2px solid ${config.primaryColor};
            padding-bottom: 15px;
            margin-bottom: 25px;
            text-align: center;
          }
          .header-title {
            color: ${config.primaryColor};
            font-size: 16pt;
            font-weight: bold;
            margin: 10px 0 5px 0;
            text-transform: uppercase;
          }
          .company-info {
            font-size: 9pt;
            color: #4b5563;
          }
          .pdf-body {
            font-size: 10pt;
            white-space: pre-wrap;
            margin-bottom: 40px;
          }
          .pdf-footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            text-align: center;
            font-size: 8pt;
            color: #6b7280;
            position: absolute;
            bottom: 20px;
            left: 30px;
            right: 30px;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 40pt;
            color: ${config.primaryColor}15;
            font-weight: 900;
            pointer-events: none;
            text-transform: uppercase;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="pdf-container">
          ${config.showWatermark ? `<div class="watermark">${companyConfig.razaoSocial || 'RAFA ARTS'}</div>` : ''}
          ${logoHtml}
          <div class="pdf-header">
            <div class="header-title">${config.headerText}</div>
            <div class="company-info">${companyConfig.razaoSocial} • CNPJ: ${companyConfig.cnpj} • ${companyConfig.endereco}</div>
          </div>
          <div class="pdf-body">${textToPrint}</div>
          <div class="pdf-footer">${config.footerText}</div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950 border border-red-500/30 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette className="text-red-500" size={20} />
            <h2 className="text-xl font-black text-white italic tracking-tight uppercase">
              Editor Visual de Layout de PDF
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Personalize cores (Preto, Vermelho, Branco), logo, fontes, cabeçalhos e rodapés do seu PDF
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfig(DEFAULT_PDF_CONFIG)}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-2 transition-all"
          >
            <RotateCcw size={14} />
            <span>Restaurar Padrão</span>
          </button>
          <button
            onClick={handlePrintPdf}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all"
          >
            <Printer size={14} className="text-red-400" />
            <span>Gerar / Imprimir PDF</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-red-950 transition-all"
          >
            {savedAlert ? <Check size={16} /> : <FileText size={16} />}
            <span>{savedAlert ? 'Salvo!' : 'Salvar Template'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Customizer Controls */}
        <div className="lg:col-span-5 space-y-5 bg-zinc-950 border border-red-500/20 rounded-3xl p-6">
          <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
            <Layout size={16} />
            Controles de Estilização
          </h3>

          {/* Color Presets */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Cores do Modelo (Paleta da Loja)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] text-zinc-400 mb-1">Cor Primária (Destaques)</p>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-white uppercase">{config.primaryColor}</span>
                </div>
              </div>

              <div>
                <p className="text-[9px] text-zinc-400 mb-1">Cor Secundária (Textos)</p>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={e => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-white uppercase">{config.secondaryColor}</span>
                </div>
              </div>

              <div>
                <p className="text-[9px] text-zinc-400 mb-1">Fundo do Papel</p>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={e => setConfig({ ...config, backgroundColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-white uppercase">{config.backgroundColor}</span>
                </div>
              </div>
            </div>

            {/* Quick Palette Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfig({ ...config, primaryColor: '#dc2626', secondaryColor: '#000000', backgroundColor: '#ffffff' })}
                className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-red-500 rounded-lg text-[9px] font-bold text-zinc-300 flex items-center gap-1.5"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span>Rafa Red (Padrão)</span>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, primaryColor: '#18181b', secondaryColor: '#000000', backgroundColor: '#ffffff' })}
                className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 rounded-lg text-[9px] font-bold text-zinc-300 flex items-center gap-1.5"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 inline-block border border-white/20"></span>
                <span>Black Lux</span>
              </button>
            </div>
          </div>

          {/* Logo Alignment & Scale */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              Posição e Tamanho do Logo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['left', 'center', 'right'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setConfig({ ...config, logoPosition: pos })}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                    config.logoPosition === pos 
                      ? 'bg-red-600/20 border-red-500 text-white' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {pos === 'left' ? 'Esquerda' : pos === 'center' ? 'Centro' : 'Direita'}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                <span>Escala da Logo</span>
                <span>{config.logoScale}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={config.logoScale}
                onChange={e => setConfig({ ...config, logoScale: Number(e.target.value) })}
                className="w-full accent-red-600"
              />
            </div>
          </div>

          {/* Font Selector */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Type size={12} className="text-red-500" />
              Tipografia / Fonte
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'sans', label: 'Moderna (Sans-Serif)' },
                { id: 'mono', label: 'Técnica (Monospace)' },
                { id: 'serif', label: 'Jurídica (Serif)' },
                { id: 'display', label: 'Elegante (Display)' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setConfig({ ...config, fontFamily: f.id as any })}
                  className={`p-2.5 rounded-xl text-left text-xs font-bold border transition-all ${
                    config.fontFamily === f.id 
                      ? 'bg-red-600/20 border-red-500 text-white' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Header & Footer Custom Texts */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Título do Cabeçalho
              </label>
              <input
                type="text"
                value={config.headerText}
                onChange={e => setConfig({ ...config, headerText: e.target.value })}
                className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                Texto do Rodapé
              </label>
              <input
                type="text"
                value={config.footerText}
                onChange={e => setConfig({ ...config, footerText: e.target.value })}
                className="w-full h-10 bg-zinc-900 border border-zinc-800 focus:border-red-500 rounded-xl px-3 text-xs text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="watermarkCheck"
                checked={config.showWatermark}
                onChange={e => setConfig({ ...config, showWatermark: e.target.checked })}
                className="w-4 h-4 accent-red-600 rounded"
              />
              <label htmlFor="watermarkCheck" className="text-xs text-zinc-300 font-semibold cursor-pointer">
                Exibir marca d'água no fundo da folha
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Live Preview Sheet */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-start overflow-hidden">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-red-500" />
              <span className="text-xs font-black uppercase text-zinc-300">
                Pré-visualização do PDF em Tempo Real
              </span>
            </div>
            <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-full font-bold">
              A4 Simulada
            </span>
          </div>

          {/* Styled A4 Sheet Mockup */}
          <div 
            className="w-full max-w-[550px] shadow-2xl rounded-xl p-8 relative min-h-[680px] transition-all overflow-hidden border"
            style={{
              backgroundColor: config.backgroundColor,
              color: '#111827',
              borderColor: config.primaryColor,
              fontFamily: config.fontFamily === 'mono' ? 'monospace' :
                          config.fontFamily === 'serif' ? 'Georgia, serif' :
                          config.fontFamily === 'display' ? 'Playfair Display, serif' :
                          'sans-serif'
            }}
          >
            {/* Watermark */}
            {config.showWatermark && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-30deg] font-black text-4xl uppercase tracking-widest text-center"
                style={{ color: config.primaryColor }}
              >
                {companyConfig.razaoSocial || 'RAFA ARTS'}
              </div>
            )}

            {/* Logo */}
            {companyConfig.logoUrl && (
              <div 
                className="mb-4"
                style={{ textAlign: config.logoPosition }}
              >
                <img 
                  src={companyConfig.logoUrl} 
                  alt="Logo preview" 
                  className="object-contain inline-block"
                  style={{ maxHeight: `${Math.round(60 * (config.logoScale / 100))}px` }}
                />
              </div>
            )}

            {/* Header */}
            <div 
              className="pb-3 mb-4 text-center border-b-2"
              style={{ borderColor: config.primaryColor }}
            >
              <h4 
                className="text-xs font-black uppercase tracking-wider mb-1"
                style={{ color: config.primaryColor }}
              >
                {config.headerText}
              </h4>
              <p className="text-[9px] text-zinc-600 font-semibold">
                {companyConfig.razaoSocial} • CNPJ: {companyConfig.cnpj}
              </p>
            </div>

            {/* Document Content Mock */}
            <div className="space-y-3 text-[10px] text-zinc-800 leading-relaxed">
              <p>
                <strong>CONTRATANTE:</strong> Carlos Alberto Oliveira, CPF nº 123.456.789-00, RG nº 12.345.678-9 DG/GO, residente na Rua das Flores, Goiânia - GO.
              </p>
              <p>
                <strong>CONTRATADA:</strong> {companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS'}, inscrita no CNPJ sob o nº {companyConfig.cnpj || '28.884.125/0001-40'}.
              </p>
              <p 
                className="p-2 rounded border-l-4 font-semibold my-2"
                style={{ backgroundColor: `${config.primaryColor}10`, borderColor: config.primaryColor }}
              >
                CLÁUSULA 1ª - OBJETO: Confecção e Instalação de Fachada Comercial ACM 3x1m com Letras Caixa LED.
              </p>
              <p>
                <strong>CLÁUSULA 3ª - VALOR:</strong> VALOR TOTAL R$ 3.800,00 (três mil e oitocentos reais), pago em 2 parcelas (Entrada 50% R$ 1.900,00 + Saldo 50% R$ 1.900,00).
              </p>
              <p>
                <strong>CLÁUSULA 8ª - ACEITE ELETRÔNICO:</strong> Aceite com validade jurídica perante a MP nº 2.200-2/2001 e Lei nº 14.063/2020 via código de verificação WhatsApp.
              </p>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-8 right-8 pt-3 border-t border-zinc-200 text-center text-[8px] text-zinc-500">
              {config.footerText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
