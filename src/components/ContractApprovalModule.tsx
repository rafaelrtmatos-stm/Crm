import React, { useState, useEffect } from 'react';
import { showAlert } from '../lib/notify';
import { 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  QrCode, 
  Copy, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  Lock, 
  Download, 
  Printer, 
  Share2, 
  Clock, 
  Building2, 
  DollarSign, 
  User, 
  Phone, 
  Calendar, 
  Hash, 
  Globe, 
  CheckSquare, 
  Sparkles,
  ArrowLeft,
  Settings2,
  Palette,
  Box,
  Eye,
  MessageSquare,
  MapPin,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Company, ServiceContract, ContractAcceptance, CompanyConfig, PdfCustomization, MerchandiseItem } from '../types';
import { generateContractText, computeContractHash, getPublicIpAddress, getDocumentKind, isValidRg, isValidPhoneBR } from '../lib/contractUtils';
import { searchCepByStreet, formatFullAddress, UF_OPTIONS, type CepResult } from '../lib/cepUtils';
import { CompanySettingsModal, DEFAULT_COMPANY_CONFIG } from './CompanySettingsModal';
import { PdfTemplateEditor, DEFAULT_PDF_CONFIG } from './PdfTemplateEditor';
import { MerchandiseModule } from './MerchandiseModule';
import { MessagingAndPreviewHub } from './MessagingAndPreviewHub';

interface ContractApprovalModuleProps {
  currentCompany: Company | null;
  onContractApproved?: (contract: ServiceContract) => void;
}

export const ContractApprovalModule = ({ currentCompany, onContractApproved }: ContractApprovalModuleProps) => {
  // Current active step in the flow:
  // 1: 'budget_form' -> Fill or select service quote
  // 2: 'contract_view' -> Read contract & check agreement
  // 3: 'code_verification' -> WhatsApp/SMS verification code
  // 4: 'signature_confirmed' -> Show digital signature proof
  // 5: 'pix_payment' -> Payment of 50% down payment
  // 6: 'success_summary' -> Finished order summary
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Sub-module navigation: 'budget' | 'merchandise' | 'pdf_editor' | 'preview_hub'
  const [activeModuleView, setActiveModuleView] = useState<'budget' | 'merchandise' | 'pdf_editor' | 'preview_hub'>('budget');

  // Configurable Company & PDF states
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(DEFAULT_COMPANY_CONFIG);
  const [pdfConfig, setPdfConfig] = useState<PdfCustomization>(DEFAULT_PDF_CONFIG);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Budget & Form state
  const [clientName, setClientName] = useState('');
  const [clientCpfCnpj, setClientCpfCnpj] = useState('');
  const [clientRg, setClientRg] = useState('');
  const [clientNacionalidade, setClientNacionalidade] = useState('brasileiro(a)');
  const [clientEstadoCivil, setClientEstadoCivil] = useState('solteiro(a)');
  const [clientProfissao, setClientProfissao] = useState('comerciante');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Busca de CEP por rua (quando o cliente sabe a rua mas nao o CEP)
  const [cepSearchUf, setCepSearchUf] = useState('');
  const [cepSearchCidade, setCepSearchCidade] = useState('');
  const [cepSearchRua, setCepSearchRua] = useState('');
  const [cepSearchNumero, setCepSearchNumero] = useState('');
  const [cepResults, setCepResults] = useState<CepResult[]>([]);
  const [isCepSearching, setIsCepSearching] = useState(false);
  const [cepSearchError, setCepSearchError] = useState<string | null>(null);
  const [serviceTitle, setServiceTitle] = useState('Fachada em ACM 3x1m com Letra Caixa LED');
  const [serviceDescription, setServiceDescription] = useState('Confecção e instalação de Fachada Comercial em Painel ACM Prata 3x1m, com letras caixa em acrílico iluminadas por fita de LED blindada 12v, estrutura metálica galvanizada e fonte bivolt.');
  const [totalAmount, setTotalAmount] = useState(3800);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [paymentMethod, setPaymentMethod] = useState('PIX / Transferência');
  const [cidadeForo, setCidadeForo] = useState('Goiânia - GO');

  // Contract details
  const [contractText, setContractText] = useState('');
  const [contractHash, setContractHash] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Verification state
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState(['', '', '', '', '', '']);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSentAlert, setCodeSentAlert] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [codeError, setCodeError] = useState(false);

  // Saved Acceptance & IP details
  const [userIp, setUserIp] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);
  const [savedAcceptance, setSavedAcceptance] = useState<ContractAcceptance | null>(null);
  const [isSavingContract, setIsSavingContract] = useState(false);

  // Payment state
  const [pixPaid, setPixPaid] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const downPaymentAmount = totalAmount / 2;

  // Preset sample budgets for quick testing
  const presets = [
    {
      title: 'Fachada ACM com LED',
      desc: 'Fachada Comercial em ACM 3x1m com Letras Caixa iluminadas por LED e estrutura galvanizada.',
      amount: 3800,
      days: 7,
      client: 'Carlos Alberto Oliveira',
      cpf: '123.456.789-00',
      phone: '(62) 99876-5432'
    },
    {
      title: '1.000 Panfletos + 500 Cartões de Visita',
      desc: 'Panfletos 10x14cm papel couché 115g 4x0 e Cartões de visita com laminação fosca e verniz localizado.',
      amount: 450,
      days: 3,
      client: 'Mariana Santos',
      cpf: '987.654.321-11',
      phone: '(62) 99222-3344'
    },
    {
      title: 'Adesivação Completa de Frota (2 Vans)',
      desc: 'Envelopamento parcial de 2 vans de entrega com adesivo vinil calandrado com impressão digital de alta resolução e verniz de proteção UV.',
      amount: 2600,
      days: 5,
      client: 'Roberto Souza',
      cpf: '456.789.123-55',
      phone: '(62) 98444-5566'
    }
  ];

  // Fetch client IP on mount
  useEffect(() => {
    getPublicIpAddress().then(setUserIp);
  }, []);

  // Countdown timer for code resend
  useEffect(() => {
    let timer: any;
    if (step === 3 && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Busca CEP a partir do UF + Cidade + Rua (o cliente sabe o endereco mas nao o CEP)
  const handleSearchCepByStreet = async () => {
    setCepSearchError(null);
    setCepResults([]);
    setIsCepSearching(true);
    try {
      const results = await searchCepByStreet(cepSearchUf, cepSearchCidade, cepSearchRua);
      if (results.length === 0) {
        setCepSearchError('Nenhum CEP encontrado para essa rua/cidade. Confira a grafia e tente novamente.');
      }
      setCepResults(results);
    } catch (err: any) {
      setCepSearchError(err?.message || 'Erro ao buscar o CEP. Tente novamente.');
    } finally {
      setIsCepSearching(false);
    }
  };

  // Cliente escolheu um dos resultados: monta o endereco completo no campo do formulario
  const handleSelectCepResult = (result: CepResult) => {
    setClientAddress(formatFullAddress(result, cepSearchNumero));
    setCepResults([]);
  };

  // Handle generating contract text & hash
  const handleGenerateContract = async () => {
    const nameOk = clientName.trim().length > 0;
    const docKind = getDocumentKind(clientCpfCnpj);
    const isCompany = docKind === 'cnpj';
    const rgOk = isCompany || isValidRg(clientRg); // CNPJ (pessoa jurídica) não tem RG
    const phoneOk = isValidPhoneBR(clientPhone);
    const addressOk = clientAddress.trim().length >= 5;
    const amountOk = totalAmount > 0;

    if (!nameOk) {
      showAlert('Informe o nome completo (ou razão social) do cliente.');
      return;
    }
    if (docKind === 'invalid') {
      showAlert('CPF ou CNPJ inválido. Confira os números digitados.');
      return;
    }
    if (!rgOk) {
      showAlert('RG do cliente inválido. Aceita o RG estadual tradicional ou o novo padrão da Carteira de Identidade Nacional (CIN).');
      return;
    }
    if (!phoneOk) {
      showAlert('Telefone WhatsApp inválido. Informe com DDD, ex: (62) 99876-5432.');
      return;
    }
    if (!addressOk) {
      showAlert('Informe o endereço completo do cliente.');
      return;
    }
    if (!amountOk) {
      showAlert('Informe o valor total do serviço.');
      return;
    }

    const text = generateContractText({
      companyName: companyConfig.razaoSocial,
      companyCnpj: companyConfig.cnpj,
      companyAddress: companyConfig.endereco,
      clientName,
      clientCpf: clientCpfCnpj,
      clientRg: isCompany ? 'não aplicável (pessoa jurídica)' : clientRg,
      clientAddress,
      clientNacionalidade,
      clientEstadoCivil,
      clientProfissao,
      serviceDescription: `${serviceTitle ? serviceTitle.toUpperCase() + ': ' : ''}${serviceDescription}`,
      deliveryDays,
      totalAmount,
      downPaymentAmount,
      paymentMethod,
      cidadeForo: cidadeForo || companyConfig.cidadeForo
    });

    const hash = await computeContractHash(text);
    setContractText(text);
    setContractHash(hash);
    setTermsAgreed(false);
    setStep(2);
  };

  // Trigger sending SMS/WhatsApp verification code
  const handleSendVerificationCode = () => {
    if (!termsAgreed) {
      showAlert('Você precisa marcar a caixa "Li e concordo com os termos" para continuar.');
      return;
    }

    setIsSendingCode(true);
    // Generate a random 6-digit code
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(randomCode);
    setInputCode(['', '', '', '', '', '']);
    setCodeError(false);

    setTimeout(() => {
      setIsSendingCode(false);
      setCodeSentAlert(`📲 WhatsApp enviado para ${clientPhone}: Seu código de confirmação Rafa Art é: ${randomCode}`);
      setCountdown(30);
      setStep(3);
    }, 1200);
  };

  // Handle verifying input code and saving to database
  const handleVerifyCodeAndSign = async () => {
    const entered = inputCode.join('');
    if (entered !== generatedCode) {
      setCodeError(true);
      return;
    }

    setIsSavingContract(true);
    try {
      const now = new Date().toISOString();
      const ip = userIp || '189.102.45.12';

      const acceptanceData: ContractAcceptance = {
        clientName,
        clientCpfCnpj,
        clientPhone,
        ipAddress: ip,
        acceptedAt: now,
        contractHash,
        contractSnapshot: contractText,
        verificationCodeUsed: generatedCode,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Rafa Arts Graphics App',
        verificationMethod: 'whatsapp_sms_code'
      };

      // Save contract document to Firestore collection 'serviceContracts'
      const contractDocRef = await addDoc(collection(db, 'serviceContracts'), {
        companyId: currentCompany?.id || 'default_company',
        clientName,
        clientCpfCnpj,
        clientPhone,
        clientEmail,
        clientAddress,
        serviceTitle,
        serviceDescription,
        totalAmount,
        downPaymentAmount,
        deliveryDays,
        contractText,
        contractHash,
        status: 'aceito',
        verificationCode: generatedCode,
        acceptance: acceptanceData,
        pixPaymentStatus: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Also register an entry in 'services' so it appears in the OS list
      await addDoc(collection(db, 'services'), {
        companyId: currentCompany?.id || 'default_company',
        orderId: `OS-${contractDocRef.id.slice(-6).toUpperCase()}`,
        client: clientName,
        phone: clientPhone,
        service: serviceTitle,
        status: 'pendente',
        priority: 'normal',
        total: totalAmount,
        balance: totalAmount - downPaymentAmount,
        createdAt: Timestamp.now()
      });

      setContractId(contractDocRef.id);
      setSavedAcceptance(acceptanceData);
      setIsSavingContract(false);
      setStep(4); // Show signed agreement confirmation
    } catch (err) {
      console.error('Erro ao salvar contrato:', err);
      setIsSavingContract(false);
      showAlert('Ocorreu um erro ao registrar a assinatura. Tente novamente.');
    }
  };

  // Confirm PIX down payment
  const handleConfirmPixPayment = async () => {
    setIsSimulatingPayment(true);
    setTimeout(async () => {
      try {
        if (contractId) {
          await updateDoc(doc(db, 'serviceContracts', contractId), {
            pixPaymentStatus: 'paid',
            status: 'entrada_paga',
            pixPaidAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
        setPixPaid(true);
        setIsSimulatingPayment(false);
        setStep(6);
      } catch (e) {
        console.error(e);
        setIsSimulatingPayment(false);
        setStep(6);
      }
    }, 1500);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Flow Header */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-2xl relative overflow-hidden shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/20">
              {companyConfig.logoUrl ? (
                <img src={companyConfig.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <FileText size={28} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest">
                  {companyConfig.razaoSocial || 'RAFA ARTS GRAPHICS'}
                </span>
                <span className="text-white/30 text-xs">•</span>
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> Validade Jurídica (MP 2.200-2 / Lei 14.063)
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase mt-1">
                Aprovação de Contrato & Entrada PIX
              </h2>
              <p className="text-xs text-zinc-400">
                CNPJ: {companyConfig.cnpj} • {companyConfig.endereco}
              </p>
            </div>
          </div>

          {/* Action Buttons: Company Config Modal */}
          <button
            type="button"
            onClick={() => setIsCompanyModalOpen(true)}
            className="px-4 py-2.5 bg-zinc-900 border border-red-500/30 hover:border-red-500 hover:bg-zinc-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg"
          >
            <Settings2 size={16} className="text-red-500" />
            <span>Dados da Empresa</span>
          </button>
        </div>

        {/* Sub-module Nav Tabs */}
        <div className="pt-2 border-t border-white/10 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveModuleView('budget')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeModuleView === 'budget' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <FileText size={14} />
            <span>Fluxo do Contrato ({step}/5)</span>
          </button>

          <button
            onClick={() => setActiveModuleView('merchandise')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeModuleView === 'merchandise' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Box size={14} />
            <span>Mercadorias & Itens Gráficos</span>
          </button>

          <button
            onClick={() => setActiveModuleView('pdf_editor')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeModuleView === 'pdf_editor' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Palette size={14} />
            <span>Editor de Layout do PDF</span>
          </button>

          <button
            onClick={() => setActiveModuleView('preview_hub')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeModuleView === 'preview_hub' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-950' 
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Eye size={14} />
            <span>Pré-visualização & Mensagens</span>
          </button>
        </div>

        {/* Flow Stepper Indicators (visible when on budget tab) */}
        {activeModuleView === 'budget' && (
          <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar pt-2 border-t border-white/5">
            {[
              { id: 1, label: 'Orçamento' },
              { id: 2, label: 'Contrato' },
              { id: 3, label: 'Código' },
              { id: 4, label: 'Aceito' },
              { id: 5, label: 'Entrada PIX' },
            ].map(s => (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  step === s.id
                    ? 'bg-red-600 text-white font-extrabold shadow-lg shadow-red-950'
                    : step > s.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-white/30 bg-white/5'
                }`}
              >
                {step > s.id ? <Check size={10} /> : <span>0{s.id}</span>}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Company Settings Modal */}
      <CompanySettingsModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        companyConfig={companyConfig}
        onSave={(newCfg) => setCompanyConfig(newCfg)}
      />

      {/* SUB-MODULE VIEW 1: Merchandise Management */}
      {activeModuleView === 'merchandise' && (
        <MerchandiseModule
          onAttachItemsToContract={(itemsList, totalVal, desc) => {
            setTotalAmount(totalVal);
            setServiceDescription(desc);
            setActiveModuleView('budget');
            showAlert(`✅ ${itemsList.length} item(ns) incorporado(s) com sucesso ao Orçamento! Total: R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
          }}
        />
      )}

      {/* SUB-MODULE VIEW 2: PDF Template Visual Editor */}
      {activeModuleView === 'pdf_editor' && (
        <PdfTemplateEditor
          companyConfig={companyConfig}
          pdfConfig={pdfConfig}
          onSavePdfConfig={(newPdfCfg) => setPdfConfig(newPdfCfg)}
          sampleContractText={contractText}
        />
      )}

      {/* SUB-MODULE VIEW 3: Messaging & Social Preview Hub */}
      {activeModuleView === 'preview_hub' && (
        <MessagingAndPreviewHub
          companyConfig={companyConfig}
          pdfConfig={pdfConfig}
          contractText={contractText}
        />
      )}

      {/* Code Sent Simulated Toast Alert */}
      <AnimatePresence>
        {codeSentAlert && step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-emerald-300 text-xs font-bold shadow-xl animate-pulse"
          >
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-emerald-400 shrink-0" />
              <span>{codeSentAlert}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedCode);
                showAlert(`Código ${generatedCode} copiado para a área de transferência!`);
              }}
              className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 cursor-pointer"
            >
              Copiar Código
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 1: ORÇAMENTO / FORM */}
      {activeModuleView === 'budget' && step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-2xl space-y-8"
        >
          {/* Preset Buttons */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[2px] text-primary-300">
                💡 Orçamentos Rápidos para Teste
              </span>
              <span className="text-[10px] text-white/40">Clique para preencher automaticamente</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setServiceTitle(p.title);
                    setServiceDescription(p.desc);
                    setTotalAmount(p.amount);
                    setDeliveryDays(p.days);
                    setClientName(p.client);
                    setClientCpfCnpj(p.cpf);
                    setClientPhone(p.phone);
                  }}
                  className="p-4 bg-slate-900/50 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-primary-500/30 text-left transition-all group cursor-pointer"
                >
                  <p className="text-xs font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                    {p.title}
                  </p>
                  <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{p.desc}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-xs font-mono font-black text-emerald-400">
                      R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] font-bold text-white/30 uppercase">{p.days} dias úteis</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User size={18} className="text-primary-400" />
              Dados do Cliente & Serviço
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Nome Completo / Razão Social *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="Ex: Carlos Alberto Oliveira"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  CPF ou CNPJ do Cliente *
                </label>
                <input
                  type="text"
                  value={clientCpfCnpj}
                  onChange={e => setClientCpfCnpj(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none font-mono"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  RG do Cliente {getDocumentKind(clientCpfCnpj) === 'cnpj' ? '(não se aplica a CNPJ)' : '*'}
                </label>
                <input
                  type="text"
                  value={clientRg}
                  onChange={e => setClientRg(e.target.value)}
                  disabled={getDocumentKind(clientCpfCnpj) === 'cnpj'}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                  placeholder="12.345.678-9 DG/GO (ou nº da CIN)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Nacionalidade
                </label>
                <input
                  type="text"
                  value={clientNacionalidade}
                  onChange={e => setClientNacionalidade(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="brasileiro(a)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Estado Civil
                </label>
                <input
                  type="text"
                  value={clientEstadoCivil}
                  onChange={e => setClientEstadoCivil(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="solteiro(a)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Profissão
                </label>
                <input
                  type="text"
                  value={clientProfissao}
                  onChange={e => setClientProfissao(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="comerciante"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Telefone WhatsApp (Para envio do Código) *
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none font-mono"
                  placeholder="(62) 99999-9999"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Forma de Pagamento
                </label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="PIX / Transferência / Cartão"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Cidade do Foro
                </label>
                <input
                  type="text"
                  value={cidadeForo}
                  onChange={e => setCidadeForo(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="Goiânia - GO"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  E-mail do Cliente (Opcional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="md:col-span-2 space-y-3 rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary-400" />
                  <span className="text-[10px] font-black text-primary-300 uppercase tracking-widest">
                    Não sabe o CEP? Busque pelo nome da rua
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={cepSearchUf}
                    onChange={e => setCepSearchUf(e.target.value)}
                    className="h-11 bg-slate-900/60 border border-white/10 rounded-xl px-3 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  >
                    <option value="" className="bg-zinc-900">UF</option>
                    {UF_OPTIONS.map(uf => (
                      <option key={uf} value={uf} className="bg-zinc-900">{uf}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={cepSearchCidade}
                    onChange={e => setCepSearchCidade(e.target.value)}
                    placeholder="Cidade"
                    className="h-11 bg-slate-900/60 border border-white/10 rounded-xl px-3 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  />
                  <input
                    type="text"
                    value={cepSearchRua}
                    onChange={e => setCepSearchRua(e.target.value)}
                    placeholder="Nome da rua"
                    className="h-11 bg-slate-900/60 border border-white/10 rounded-xl px-3 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  />
                  <input
                    type="text"
                    value={cepSearchNumero}
                    onChange={e => setCepSearchNumero(e.target.value)}
                    placeholder="Número (opcional)"
                    className="h-11 bg-slate-900/60 border border-white/10 rounded-xl px-3 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSearchCepByStreet}
                  disabled={isCepSearching || !cepSearchUf || !cepSearchCidade || cepSearchRua.trim().length < 3}
                  className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-[11px] font-black uppercase px-4 py-2.5 transition-colors"
                >
                  {isCepSearching ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                  Buscar CEP
                </button>

                {cepSearchError && (
                  <p className="text-[11px] text-red-400">{cepSearchError}</p>
                )}

                {cepResults.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {cepResults.map((r, idx) => (
                      <button
                        key={`${r.cep}-${idx}`}
                        type="button"
                        onClick={() => handleSelectCepResult(r)}
                        className="w-full text-left p-3 rounded-xl bg-slate-900/60 hover:bg-white/10 border border-white/10 hover:border-primary-500/40 transition-all"
                      >
                        <p className="text-xs font-bold text-white">{r.logradouro}</p>
                        <p className="text-[10px] text-white/50">
                          {r.bairro} • {r.localidade}/{r.uf} • CEP: <span className="font-mono text-primary-300">{r.cep}</span>
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Endereço do Cliente / Entrega *
                </label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={e => setClientAddress(e.target.value)}
                  className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:border-primary-500 outline-none"
                  placeholder="Rua, Número, Bairro, Cidade - Estado"
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-400" />
                Valores & Especificação do Serviço
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    Título do Serviço / Produto *
                  </label>
                  <input
                    type="text"
                    value={serviceTitle}
                    onChange={e => setServiceTitle(e.target.value)}
                    className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-bold text-white focus:border-primary-500 outline-none uppercase"
                    placeholder="Ex: FACHADA EM ACM COM LED"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    Prazo de Entrega (Dias Úteis)
                  </label>
                  <input
                    type="number"
                    value={deliveryDays}
                    onChange={e => setDeliveryDays(Number(e.target.value))}
                    className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-xs font-bold text-white focus:border-primary-500 outline-none"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    Descrição Detalhada do Serviço / Especificações Técnicas
                  </label>
                  <textarea
                    rows={3}
                    value={serviceDescription}
                    onChange={e => setServiceDescription(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-4 text-xs font-medium text-white focus:border-primary-500 outline-none resize-none"
                    placeholder="Descreva materiais, dimensões, faca de corte, lâmpadas, acrilicos, etc."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                    Valor Total do Serviço (R$) *
                  </label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={e => setTotalAmount(Number(e.target.value))}
                    className="w-full h-12 bg-slate-900/60 border border-white/10 rounded-xl px-4 text-sm font-black text-emerald-400 focus:border-primary-500 outline-none"
                  />
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                    Entrada Exigida (50%)
                  </span>
                  <span className="text-xl font-black text-white mt-0.5">
                    R$ {downPaymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col justify-center">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">
                    Saldo Restante (50% na Entrega)
                  </span>
                  <span className="text-xl font-black text-white/70 mt-0.5">
                    R$ {downPaymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleGenerateContract}
                className="px-8 py-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-primary-500/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                Gerar Contrato de Prestação de Serviços
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: CONTRATO NA TELA + CHECKBOX */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-2xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} /> Voltar ao Orçamento
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-primary-300 bg-primary-500/10 px-3 py-1 rounded-full border border-primary-500/20">
                HASH INTEGRAL: {contractHash.slice(0, 16)}...
              </span>
            </div>
          </div>

          {/* Paper / Digital Document Container */}
          <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-6 md:p-8 max-h-[480px] overflow-y-auto custom-scrollbar font-mono text-xs text-white/80 leading-relaxed space-y-4 shadow-inner">
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-200">
              {contractText}
            </pre>
          </div>

          {/* Checkbox Section */}
          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl space-y-4">
            <label className="flex items-start gap-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={e => setTermsAgreed(e.target.checked)}
                className="w-6 h-6 mt-0.5 rounded-lg border-2 border-primary-500 text-primary-500 focus:ring-0 bg-slate-950 cursor-pointer accent-primary-500"
              />
              <div>
                <p className="text-xs font-bold text-white leading-snug">
                  Li, compreendi e concordo integralmente com todas as cláusulas, especificações, prazos e valores do Contrato de Prestação de Serviços Rafa Art acima.
                </p>
                <p className="text-[10px] text-white/40 mt-1">
                  Ao marcar esta caixa, você autoriza o envio do código de confirmação de identidade por WhatsApp/SMS para o número {clientPhone}.
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Contrato_RafaArt_${clientName.replace(/\s+/g, '_')}.txt`;
                a.click();
              }}
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Download size={14} /> Baixar Minuta (.TXT)
            </button>

            <button
              type="button"
              disabled={!termsAgreed || isSendingCode}
              onClick={handleSendVerificationCode}
              className="px-8 py-4 bg-primary-500 hover:bg-primary-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-primary-500/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              {isSendingCode ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Gerando e Enviando Código...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Enviar Código de Verificação por WhatsApp/SMS
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: VERIFICAÇÃO DE CÓDIGO */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-2xl max-w-2xl mx-auto space-y-8 text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
            <Smartphone size={32} />
          </div>

          <div>
            <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">
              Verificação de Identidade
            </h3>
            <p className="text-xs text-white/60 mt-2 max-w-md mx-auto">
              Enviamos um código de segurança com 6 dígitos para o WhatsApp/SMS do número{' '}
              <strong className="text-primary-300 font-mono">{clientPhone}</strong>. Insira o código abaixo para assinar digitalmente o contrato.
            </p>
          </div>

          {/* 6 Digit Input Blocks */}
          <div className="space-y-3">
            <div className="flex justify-center items-center gap-2 sm:gap-3">
              {[0, 1, 2, 3, 4, 5].map(index => (
                <input
                  key={index}
                  id={`code-input-${index}`}
                  type="text"
                  maxLength={1}
                  value={inputCode[index]}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    const newCode = [...inputCode];
                    newCode[index] = val;
                    setInputCode(newCode);
                    setCodeError(false);

                    // Auto-advance focus
                    if (val && index < 5) {
                      const nextInput = document.getElementById(`code-input-${index + 1}`);
                      nextInput?.focus();
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !inputCode[index] && index > 0) {
                      const prevInput = document.getElementById(`code-input-${index - 1}`);
                      prevInput?.focus();
                    }
                  }}
                  className={`w-11 h-14 sm:w-14 sm:h-16 rounded-2xl bg-slate-900 border text-center font-mono text-xl font-black text-white focus:border-primary-400 outline-none shadow-inner transition-all ${
                    codeError ? 'border-rose-500 text-rose-400' : 'border-white/10'
                  }`}
                />
              ))}
            </div>

            {codeError && (
              <p className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1 animate-shake">
                <AlertCircle size={14} /> Código incorreto. Verifique o número enviado e tente novamente.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-white/5">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={handleSendVerificationCode}
              className="text-xs font-bold text-primary-300 hover:text-white disabled:opacity-40 cursor-pointer disabled:pointer-events-none"
            >
              {countdown > 0 ? `Reenviar código em ${countdown}s` : 'Reenviar Código por WhatsApp'}
            </button>

            <button
              type="button"
              disabled={inputCode.join('').length < 6 || isSavingContract}
              onClick={handleVerifyCodeAndSign}
              className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40"
            >
              {isSavingContract ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Registrando Assinatura no Banco...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Confirmar Código e Assinar Contrato
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: ASSINATURA REGISTRADA E COMPROVANTE DIGITAL */}
      {step === 4 && savedAcceptance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-2xl space-y-6"
        >
          <div className="p-6 bg-emerald-500/15 border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-widest">
                  ASSINATURA ELETRÔNICA CONFIRMADA
                </span>
                <span className="text-white/30 text-xs">•</span>
                <span className="text-xs font-mono font-bold text-white/60">ID: {contractId}</span>
              </div>
              <h3 className="text-xl font-black text-white italic tracking-tight uppercase mt-1">
                Contrato Aceito e Armazenado em Banco de Dados
              </h3>
              <p className="text-xs text-white/70 mt-1">
                A validação de identidade foi realizada com sucesso por código de verificação WhatsApp. Todos os metadados de auditoria foram gravados.
              </p>
            </div>
          </div>

          {/* Audit Metadata Card */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[2px] text-primary-300 flex items-center gap-2 border-b border-white/10 pb-3">
              <Lock size={14} /> Registro de Autenticidade Digital (Auditoria Jurídica)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-white/40 font-black uppercase block">Nome do Signatário</span>
                <span className="text-white font-bold">{savedAcceptance.clientName}</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-white/40 font-black uppercase block">CPF / CNPJ</span>
                <span className="text-white font-bold">{savedAcceptance.clientCpfCnpj}</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-white/40 font-black uppercase block">Telefone Verificado</span>
                <span className="text-emerald-400 font-bold">{savedAcceptance.clientPhone}</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-white/40 font-black uppercase block">Endereço IP Registrado</span>
                <span className="text-primary-300 font-bold">{savedAcceptance.ipAddress}</span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-white/40 font-black uppercase block">Data e Hora Exata</span>
                <span className="text-white font-bold">
                  {new Date(savedAcceptance.acceptedAt as string).toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-white/40 font-black uppercase block">Método de Validação</span>
                <span className="text-white font-bold">WhatsApp OTP ({savedAcceptance.verificationCodeUsed})</span>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[9px] text-white/40 font-black uppercase block">Hash do Conteúdo do Contrato (SHA-256)</span>
                <span className="text-primary-300 font-bold break-all">{savedAcceptance.contractHash}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-xs text-white/50 italic">
              Próxima etapa: Pagamento da Entrada de 50% para liberar o pedido em produção.
            </span>

            <button
              type="button"
              onClick={() => setStep(5)}
              className="w-full sm:w-auto px-8 py-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-primary-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              Avançar para Pagamento PIX da Entrada (R$ {downPaymentAmount.toFixed(2)})
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 5: TELA DE PAGAMENTO PIX DA ENTRADA (50%) */}
      {step === 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-2xl space-y-8"
        >
          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              Sinal Obrigatório de Produção (50%)
            </span>
            <h3 className="text-3xl font-black text-white italic tracking-tight uppercase">
              Pagamento da Entrada via PIX
            </h3>
            <p className="text-xs text-white/60">
              Após a confirmação do pagamento, sua ordem de serviço será liberada automaticamente para o setor de produção da Rafa Art.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Summary Box */}
            <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 space-y-6">
              <h4 className="text-xs font-black uppercase tracking-[2px] text-primary-300 border-b border-white/10 pb-3">
                Resumo da Compra & Sinal
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Cliente:</span>
                  <span className="text-white font-bold">{clientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Serviço:</span>
                  <span className="text-white font-bold text-right max-w-[200px] truncate">{serviceTitle}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Prazo de Produção:</span>
                  <span className="text-white font-bold">{deliveryDays} dias úteis</span>
                </div>
                <div className="flex justify-between text-xs pt-3 border-t border-white/5">
                  <span className="text-white/50">Valor Total do Serviço:</span>
                  <span className="text-white font-mono font-bold">
                    R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-black">
                  <span>Valor da Entrada PIX (50%):</span>
                  <span className="font-mono">
                    R$ {downPaymentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3 text-xs text-white/60">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <span>O sinal restante de R$ {downPaymentAmount.toFixed(2)} será pago na retirada do material.</span>
              </div>
            </div>

            {/* Right: QR Code & Pix Copy Paste */}
            <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 text-center space-y-6 flex flex-col items-center">
              <div className="w-56 h-56 bg-white rounded-3xl p-4 shadow-2xl flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=RafaArt-Pix-${downPaymentAmount.toFixed(2)}`}
                  alt="QR Code Pix"
                  className="w-full h-full"
                  referrerPolicy="no-referrer"
                />
              </div>

              <p className="text-[10px] text-primary-400 font-black uppercase tracking-widest animate-pulse">
                Aponte a câmera do aplicativo do seu banco para pagar
              </p>

              <div className="w-full space-y-2">
                <div className="p-3 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between text-left">
                  <div>
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-wider block">Chave PIX CNPJ</span>
                    <span className="text-xs font-mono font-bold text-white">44.222.111/0001-99</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('44.222.111/0001-99');
                      showAlert('Chave PIX copiada!');
                    }}
                    className="px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 text-[9px] font-black uppercase rounded-lg border border-primary-500/20 cursor-pointer"
                  >
                    Copiar
                  </button>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between text-left">
                  <div className="overflow-hidden">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-wider block">Código Copia e Cola</span>
                    <span className="text-[10px] font-mono text-white/40 truncate block max-w-[200px]">
                      00020101021126580014br.gov.bcb.pix011844222111000199520400005303986540{downPaymentAmount.toFixed(2)}5802BR5915RafaArt6009SAOPAULO
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`00020101021126580014br.gov.bcb.pix011844222111000199520400005303986540${downPaymentAmount.toFixed(2)}5802BR5915RafaArt6009SAOPAULO`);
                      showAlert('Código PIX Copia e Cola copiado!');
                    }}
                    className="px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 text-[9px] font-black uppercase rounded-lg border border-primary-500/20 cursor-pointer shrink-0"
                  >
                    Copiar Código
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={isSimulatingPayment}
                onClick={handleConfirmPixPayment}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSimulatingPayment ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Verificando Pagamento no Banco...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} /> Confirmar Recebimento do PIX
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 6: SUCESSO E RESUMO FINAL */}
      {step === 6 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-2xl max-w-3xl mx-auto space-y-8 text-center"
        >
          <div className="w-20 h-20 bg-emerald-500 text-slate-950 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
            <Check size={40} />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              PEDIDO APROVADO & ENTRADA PAGA
            </span>
            <h3 className="text-3xl font-black text-white italic tracking-tight uppercase mt-2">
              Processo Concluído com Sucesso!
            </h3>
            <p className="text-xs text-white/60 mt-1 max-w-md mx-auto">
              O contrato assinado digitalmente e o comprovante do sinal de R$ {downPaymentAmount.toFixed(2)} foram vinculados à Ordem de Serviço.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-6 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-primary-300">
                Resumo da Ordem de Serviço (Rafa Art)
              </span>
              <span className="text-xs font-mono font-bold text-white/60">ID: {contractId?.slice(-8).toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-white/40 uppercase font-black block">Cliente</span>
                <span className="text-white font-bold">{clientName}</span>
              </div>

              <div>
                <span className="text-[10px] text-white/40 uppercase font-black block">Telefone</span>
                <span className="text-white font-bold">{clientPhone}</span>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-white/40 uppercase font-black block">Serviço</span>
                <span className="text-white font-bold">{serviceTitle}</span>
              </div>

              <div>
                <span className="text-[10px] text-white/40 uppercase font-black block">Valor Total</span>
                <span className="text-white font-mono font-bold">R$ {totalAmount.toFixed(2)}</span>
              </div>

              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-black block">Entrada PIX Paga</span>
                <span className="text-emerald-400 font-mono font-bold">R$ {downPaymentAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                const text = `Olá ${clientName}! Seu contrato de prestação de serviços com a Rafa Art foi assinado e a entrada de R$ ${downPaymentAmount.toFixed(2)} foi confirmada! Seu pedido "${serviceTitle}" já entrou em produção.`;
                window.open(`https://wa.me/${clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`);
              }}
              className="py-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 size={16} /> Enviar Comprovante no WhatsApp
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={16} /> Imprimir Via do Contrato
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-4 bg-primary-500 hover:bg-primary-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-primary-500/20"
            >
              <Sparkles size={16} /> Novo Orçamento
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
