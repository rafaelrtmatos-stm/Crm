import React, { useState, useRef, useEffect } from 'react';
import { Clock, Upload, FileSpreadsheet, Search, Users, CheckCircle2, XCircle, Calendar, AlertTriangle, Download, RefreshCw, Plus, Edit3, Trash2, Save, X, Link2, Unlink } from 'lucide-react';
import { showAlert } from '../lib/notify';
import { cn } from './SharedUI';
import { supabase } from '../supabase';

export interface PontoRecord {
  date: string;
  status: string;
  details?: string;
}

export interface PontoEmployee {
  id: string;
  name: string;
  department: string;
  shift: string;
  period: string;
  daysWorked: number;
  presentDays: number;
  absentDays: number;
  lateMinutes: number;
  linkedClientId?: string;
  linkedClientName?: string;
  records: PontoRecord[];
}

export function PontoModule() {
  const [employees, setEmployees] = useState<PontoEmployee[]>(() => {
    try {
      const saved = localStorage.getItem('rpro_controle_ponto_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  
  const [systemClients, setSystemClients] = useState<{ id: string; full_name: string; phone?: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PontoEmployee | null>(null);
  
  // Modais de edição
  const [isEditingEmp, setIsEditingEmp] = useState(false);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpDept, setEditEmpDept] = useState('');
  const [editEmpShift, setEditEmpShift] = useState('');
  const [editLinkedClientId, setEditLinkedClientId] = useState('');

  // Edição de registros diários
  const [editingRecordIdx, setEditingRecordIdx] = useState<number | null>(null);
  const [editRecDate, setEditRecDate] = useState('');
  const [editRecStatus, setEditRecStatus] = useState('');
  const [editRecDetails, setEditRecDetails] = useState('');

  // Adicionar novo registro ou funcionário
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [newRecDate, setNewRecDate] = useState('');
  const [newRecStatus, setNewRecStatus] = useState('Trabalhou (Presença)');
  const [newRecDetails, setNewRecDetails] = useState('');

  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');
  const [newEmpShift, setNewEmpShift] = useState('');
  const [newLinkedClientId, setNewLinkedClientId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega clientes do sistema para vínculo
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase.from('clientes').select('id, full_name, phone').order('full_name');
        if (!error && data) {
          setSystemClients(data);
        }
      } catch (e) {
        // Fallback local se necessário
      }
    };
    fetchClients();
  }, []);

  const saveToStorage = (newEmps: PontoEmployee[]) => {
    setEmployees(newEmps);
    try {
      localStorage.setItem('rpro_controle_ponto_data', JSON.stringify(newEmps));
    } catch (e) {}
  };

  const parsePontoText = (text: string) => {
    const lines = text.split(/\r?\n/);
    const parsedEmployees: PontoEmployee[] = [];
    
    let currentEmp: Partial<PontoEmployee> | null = null;
    let currentRecords: PontoRecord[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      if (line.includes('ID:')) {
        if (currentEmp && currentEmp.name) {
          parsedEmployees.push({
            id: currentEmp.id || String(parsedEmployees.length + 1),
            name: currentEmp.name || 'Desconhecido',
            department: currentEmp.department || 'Geral',
            shift: currentEmp.shift || 'Turno 1',
            period: currentEmp.period || 'Mês Atual',
            daysWorked: currentEmp.daysWorked || currentRecords.length,
            presentDays: currentEmp.presentDays || currentRecords.filter(r => !r.status.includes('Falta')).length,
            absentDays: currentEmp.absentDays || currentRecords.filter(r => r.status.includes('Falta')).length,
            lateMinutes: currentEmp.lateMinutes || 0,
            records: currentRecords
          });
        }
        currentEmp = {};
        currentRecords = [];

        const idMatch = line.match(/ID:\s*([^;]+)/i) || line.match(/ID:(\d+)/i);
        if (idMatch) currentEmp.id = idMatch[1].trim();

        const nomeMatch = line.match(/nome:\s*([^;]+)/i);
        if (nomeMatch) currentEmp.name = nomeMatch[1].trim();

        const deptMatch = line.match(/departamento\s*(?:de)?:?\s*([^;]+)/i);
        if (deptMatch) currentEmp.department = deptMatch[1].trim();

        const turnoMatch = line.match(/turma\s*(?:do)?:?\s*([^;]+)/i);
        if (turnoMatch) currentEmp.shift = turnoMatch[1].trim();

        const periodoMatch = line.match(/(?:Data|Período)[^:]*:\s*([^;]+)/i);
        if (periodoMatch) currentEmp.period = periodoMatch[1].trim();
      }

      if (line.includes('DIAS de trabalho') || line.includes('Dias de presença')) {
        const diasTrab = line.match(/trabalho:\s*([\d.]+)/i);
        if (diasTrab && currentEmp) currentEmp.daysWorked = parseFloat(diasTrab[1]) || 0;

        const presenca = line.match(/presen[çc]a:\s*([\d.]+)/i);
        if (presenca && currentEmp) currentEmp.presentDays = parseFloat(presenca[1]) || 0;

        const ausencia = line.match(/aus[êe]ncia:\s*([\d.]+)/i);
        if (ausencia && currentEmp) currentEmp.absentDays = parseFloat(ausencia[1]) || 0;
      }

      const dayRecordMatch = line.match(/^(\d{2}-\d{2});\s*([^;]*);(.*)$/);
      if (dayRecordMatch && currentEmp) {
        const dateStr = dayRecordMatch[1];
        const statusVal = dayRecordMatch[2].trim();
        const rest = dayRecordMatch[3];
        currentRecords.push({
          date: dateStr,
          status: statusVal || 'Trabalhou',
          details: rest ? rest.replace(/;/g, ' ').trim() : undefined
        });
      }
    }

    if (currentEmp && currentEmp.name) {
      parsedEmployees.push({
        id: currentEmp.id || String(parsedEmployees.length + 1),
        name: currentEmp.name || 'Desconhecido',
        department: currentEmp.department || 'Geral',
        shift: currentEmp.shift || 'Turno 1',
        period: currentEmp.period || 'Mês Atual',
        daysWorked: currentEmp.daysWorked || currentRecords.length,
        presentDays: currentEmp.presentDays || currentRecords.filter(r => !r.status.includes('Falta')).length,
        absentDays: currentEmp.absentDays || currentRecords.filter(r => r.status.includes('Falta')).length,
        lateMinutes: currentEmp.lateMinutes || 0,
        records: currentRecords
      });
    }

    return parsedEmployees;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = parsePontoText(text);
      if (parsed.length === 0) {
        showAlert('Nenhum registro de ponto reconhecido no arquivo. Verifique o formato.');
      } else {
        saveToStorage(parsed);
        setSelectedEmployee(parsed[0]);
        showAlert(`Sucesso! ${parsed.length} funcionários importados.`);
      }
    } catch (err: any) {
      console.error(err);
      showAlert(`Erro ao ler arquivo: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveEmployeeInfo = () => {
    if (!selectedEmployee) return;
    const clientFound = systemClients.find(c => c.id === editLinkedClientId);
    const updated = employees.map(emp => {
      if (emp.id === selectedEmployee.id) {
        return {
          ...emp,
          name: editEmpName || emp.name,
          department: editEmpDept || emp.department,
          shift: editEmpShift || emp.shift,
          linkedClientId: editLinkedClientId || undefined,
          linkedClientName: clientFound ? clientFound.full_name : undefined
        };
      }
      return emp;
    });
    const modified = updated.find(e => e.id === selectedEmployee.id) || null;
    saveToStorage(updated);
    setSelectedEmployee(modified);
    setIsEditingEmp(false);
    showAlert('Dados do funcionário e vínculo atualizados!');
  };

  const handleDeleteEmployee = (id: string) => {
    if (!confirm('Deseja excluir este funcionário e seu espelho de ponto?')) return;
    const updated = employees.filter(e => e.id !== id);
    saveToStorage(updated);
    if (selectedEmployee?.id === id) {
      setSelectedEmployee(updated[0] || null);
    }
    showAlert('Funcionário removido.');
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      showAlert('Informe o nome do funcionário.');
      return;
    }
    const clientFound = systemClients.find(c => c.id === newLinkedClientId);
    const newEmp: PontoEmployee = {
      id: newEmpId.trim() || String(employees.length + 1),
      name: newEmpName.trim().toUpperCase(),
      department: newEmpDept.trim() || 'Geral',
      shift: newEmpShift.trim() || 'Turno 1',
      period: 'Mês Atual',
      daysWorked: 0,
      presentDays: 0,
      absentDays: 0,
      lateMinutes: 0,
      linkedClientId: newLinkedClientId || undefined,
      linkedClientName: clientFound ? clientFound.full_name : undefined,
      records: []
    };
    const updated = [...employees, newEmp];
    saveToStorage(updated);
    setSelectedEmployee(newEmp);
    setIsAddingEmp(false);
    setNewEmpId('');
    setNewEmpName('');
    setNewEmpDept('');
    setNewEmpShift('');
    setNewLinkedClientId('');
    showAlert('Funcionário cadastrado e vinculado com sucesso!');
  };

  const handleSaveRecord = () => {
    if (!selectedEmployee || editingRecordIdx === null) return;
    const updatedRecords = [...selectedEmployee.records];
    updatedRecords[editingRecordIdx] = {
      date: editRecDate,
      status: editRecStatus,
      details: editRecDetails
    };

    const presentCount = updatedRecords.filter(r => !r.status.toLowerCase().includes('falta') && !r.status.toLowerCase().includes('ausente')).length;
    const absentCount = updatedRecords.filter(r => r.status.toLowerCase().includes('falta') || r.status.toLowerCase().includes('ausente')).length;

    const updatedEmp: PontoEmployee = {
      ...selectedEmployee,
      daysWorked: updatedRecords.length,
      presentDays: presentCount,
      absentDays: absentCount,
      records: updatedRecords
    };

    const updatedList = employees.map(e => e.id === updatedEmp.id ? updatedEmp : e);
    saveToStorage(updatedList);
    setSelectedEmployee(updatedEmp);
    setEditingRecordIdx(null);
    showAlert('Registro de ponto atualizado!');
  };

  const handleDeleteRecord = (idx: number) => {
    if (!selectedEmployee) return;
    const updatedRecords = selectedEmployee.records.filter((_, i) => i !== idx);
    const presentCount = updatedRecords.filter(r => !r.status.toLowerCase().includes('falta')).length;
    const absentCount = updatedRecords.filter(r => r.status.toLowerCase().includes('falta')).length;

    const updatedEmp: PontoEmployee = {
      ...selectedEmployee,
      daysWorked: updatedRecords.length,
      presentDays: presentCount,
      absentDays: absentCount,
      records: updatedRecords
    };

    const updatedList = employees.map(e => e.id === updatedEmp.id ? updatedEmp : e);
    saveToStorage(updatedList);
    setSelectedEmployee(updatedEmp);
    showAlert('Registro removido.');
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !newRecDate.trim()) {
      showAlert('Informe a data do registro.');
      return;
    }
    const updatedRecords = [
      ...selectedEmployee.records,
      {
        date: newRecDate.trim(),
        status: newRecStatus.trim(),
        details: newRecDetails.trim() || undefined
      }
    ].sort((a, b) => a.date.localeCompare(b.date));

    const presentCount = updatedRecords.filter(r => !r.status.toLowerCase().includes('falta')).length;
    const absentCount = updatedRecords.filter(r => r.status.toLowerCase().includes('falta')).length;

    const updatedEmp: PontoEmployee = {
      ...selectedEmployee,
      daysWorked: updatedRecords.length,
      presentDays: presentCount,
      absentDays: absentCount,
      records: updatedRecords
    };

    const updatedList = employees.map(e => e.id === updatedEmp.id ? updatedEmp : e);
    saveToStorage(updatedList);
    setSelectedEmployee(updatedEmp);
    setIsAddingRecord(false);
    setNewRecDate('');
    setNewRecDetails('');
    showAlert('Novo ponto adicionado!');
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
            <Clock className="text-primary-400" size={24} />
            Controle de Ponto, Horas & Frequência
          </h2>
          <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
            Vínculo com o sistema, gestão de jornadas, faltas, presenças e espelho de ponto
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".csv,.txt,.xls,.xlsx" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <button
            onClick={() => {
              setNewEmpId(String(employees.length + 1));
              setIsAddingEmp(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
          >
            <Plus size={14} /> Novo Funcionário
          </button>
          <button
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            <Upload size={14} className={cn(isImporting && "animate-pulse")} />
            {isImporting ? 'Lendo...' : 'Importar Relatório (.xls/.csv)'}
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
            <FileSpreadsheet size={32} />
          </div>
          <div className="max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Nenhum funcionário cadastrado ou importado</h3>
            <p className="text-white/50 text-xs leading-relaxed mb-6">
              Importe o arquivo do seu relógio de ponto (.xls, .csv) ou cadastre funcionários manualmente para controlar horários e espelhos de ponto.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setNewEmpId('1');
                  setIsAddingEmp(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10"
              >
                Cadastrar Manual
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all"
              >
                Importar Planilha
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Funcionários */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
              <input 
                type="text"
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary-500 transition-all"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setIsEditingEmp(false);
                  }}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                    selectedEmployee?.id === emp.id 
                      ? "bg-primary-500/15 border-primary-500/40 text-white shadow-lg"
                      : "bg-slate-950/40 border-white/5 text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-black text-xs">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-white">{emp.name}</p>
                        {emp.linkedClientId && (
                          <span title={`Vinculado a: ${emp.linkedClientName}`} className="text-emerald-400">
                            <Link2 size={12} />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40">{emp.department} • ID: {emp.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-bold">
                      {emp.presentDays} pres.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Espelho de Ponto & Detalhes */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl p-6 space-y-6">
            {selectedEmployee ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                  <div>
                    {!isEditingEmp ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-white uppercase">{selectedEmployee.name}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-300 text-[10px] font-bold">
                          ID: {selectedEmployee.id}
                        </span>
                        {selectedEmployee.linkedClientName ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            <Link2 size={12} /> Vinculado: {selectedEmployee.linkedClientName}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                            <Unlink size={12} /> Não vinculado ao sistema
                          </span>
                        )}
                        <button 
                          onClick={() => {
                            setEditEmpName(selectedEmployee.name);
                            setEditEmpDept(selectedEmployee.department);
                            setEditEmpShift(selectedEmployee.shift);
                            setEditLinkedClientId(selectedEmployee.linkedClientId || '');
                            setIsEditingEmp(true);
                          }}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-auto"
                          title="Editar Dados e Vínculo"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Excluir Funcionário"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-white/10">
                        <p className="text-xs font-bold text-white uppercase">Editar Funcionário & Vínculo</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">Nome</label>
                            <input 
                              type="text"
                              value={editEmpName}
                              onChange={(e) => setEditEmpName(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">Departamento</label>
                            <input 
                              type="text"
                              value={editEmpDept}
                              onChange={(e) => setEditEmpDept(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/50 block mb-1">Turno</label>
                            <input 
                              type="text"
                              value={editEmpShift}
                              onChange={(e) => setEditEmpShift(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-emerald-400 font-bold block mb-1">Vincular com Contato/Cliente do Sistema</label>
                            <select
                              value={editLinkedClientId}
                              onChange={(e) => setEditLinkedClientId(e.target.value)}
                              className="w-full bg-slate-900 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            >
                              <option value="">-- Nenhum vínculo --</option>
                              {systemClients.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `(${c.phone})` : ''}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end pt-1">
                          <button onClick={() => setIsEditingEmp(false)} className="px-3 py-1.5 rounded bg-white/5 text-white/60 hover:text-white text-xs">Cancelar</button>
                          <button onClick={handleSaveEmployeeInfo} className="px-4 py-1.5 rounded bg-primary-500 text-slate-950 font-black text-xs">Salvar Alterações</button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-white/50 mt-1">
                      {selectedEmployee.department} • Turno: {selectedEmployee.shift} • Período: {selectedEmployee.period}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase font-bold">Dias Trab.</p>
                      <p className="text-sm font-black text-white">{selectedEmployee.daysWorked}</p>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[10px] text-emerald-400 uppercase font-bold">Presenças</p>
                      <p className="text-sm font-black text-emerald-300">{selectedEmployee.presentDays}</p>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <p className="text-[10px] text-rose-400 uppercase font-bold">Ausências</p>
                      <p className="text-sm font-black text-rose-300">{selectedEmployee.absentDays}</p>
                    </div>
                  </div>
                </div>

                {/* Seção de Registros Diários */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">
                      Espelho de Ponto Diário ({selectedEmployee.records.length} registros)
                    </h4>
                    <button
                      onClick={() => {
                        setNewRecDate('09-' + String(selectedEmployee.records.length + 1).padStart(2, '0'));
                        setNewRecStatus('Trabalhou (Presença)');
                        setNewRecDetails('');
                        setIsAddingRecord(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 text-xs font-bold transition-all border border-primary-500/30"
                    >
                      <Plus size={13} /> Adicionar Ponto
                    </button>
                  </div>

                  {isAddingRecord && (
                    <form onSubmit={handleAddRecord} className="bg-slate-950 p-4 rounded-xl border border-primary-500/30 space-y-3 animate-in fade-in duration-200">
                      <p className="text-xs font-bold text-white uppercase">Novo Registro de Ponto</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-white/50 block mb-1">Data (ex: 09-01)</label>
                          <input 
                            type="text"
                            required
                            value={newRecDate}
                            onChange={(e) => setNewRecDate(e.target.value)}
                            placeholder="09-01"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/50 block mb-1">Status / Código</label>
                          <input 
                            type="text"
                            required
                            value={newRecStatus}
                            onChange={(e) => setNewRecStatus(e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/50 block mb-1">Detalhes / Horários</label>
                          <input 
                            type="text"
                            value={newRecDetails}
                            onChange={(e) => setNewRecDetails(e.target.value)}
                            placeholder="08:00 - 17:00"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setIsAddingRecord(false)} className="px-3 py-1.5 rounded bg-white/5 text-white/60 text-xs">Cancelar</button>
                        <button type="submit" className="px-4 py-1.5 rounded bg-primary-500 text-slate-950 font-black text-xs">Salvar Registro</button>
                      </div>
                    </form>
                  )}

                  <div className="bg-slate-950 border border-white/10 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-bold text-white/40 uppercase bg-white/5">
                          <th className="p-3">Data</th>
                          <th className="p-3">Status / Código</th>
                          <th className="p-3">Detalhes / Horas</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {selectedEmployee.records.map((rec, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 font-mono text-white/80">
                              {editingRecordIdx === idx ? (
                                <input 
                                  type="text"
                                  value={editRecDate}
                                  onChange={(e) => setEditRecDate(e.target.value)}
                                  className="w-20 bg-slate-900 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white"
                                />
                              ) : rec.date}
                            </td>
                            <td className="p-3">
                              {editingRecordIdx === idx ? (
                                <input 
                                  type="text"
                                  value={editRecStatus}
                                  onChange={(e) => setEditRecStatus(e.target.value)}
                                  className="w-full bg-slate-900 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white"
                                />
                              ) : (
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold",
                                  rec.status.toLowerCase().includes('falta') || rec.status.toLowerCase().includes('ausente')
                                    ? "bg-rose-500/20 text-rose-300" 
                                    : "bg-emerald-500/20 text-emerald-300"
                                )}>
                                  {rec.status}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-white/50">
                              {editingRecordIdx === idx ? (
                                <input 
                                  type="text"
                                  value={editRecDetails}
                                  onChange={(e) => setEditRecDetails(e.target.value)}
                                  className="w-full bg-slate-900 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white"
                                />
                              ) : (rec.details || '-')}
                            </td>
                            <td className="p-3 text-right">
                              {editingRecordIdx === idx ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={handleSaveRecord} className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" title="Salvar">
                                    <Save size={13} />
                                  </button>
                                  <button onClick={() => setEditingRecordIdx(null)} className="p-1 rounded bg-white/5 text-white/50 hover:text-white" title="Cancelar">
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => {
                                      setEditingRecordIdx(idx);
                                      setEditRecDate(rec.date);
                                      setEditRecStatus(rec.status);
                                      setEditRecDetails(rec.details || '');
                                    }}
                                    className="p-1 rounded bg-white/5 text-white/50 hover:text-white transition-colors"
                                    title="Editar Registro"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteRecord(idx)}
                                    className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                                    title="Excluir Registro"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-white/40 text-xs">
                <Users size={32} className="mb-2 opacity-50" />
                Selecione um funcionário ao lado para gerenciar o espelho de ponto e vínculos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Novo Funcionário */}
      {isAddingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-white font-black text-base uppercase">Cadastrar Novo Funcionário</h3>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase block mb-1">ID (Matrícula)</label>
                <input 
                  type="text"
                  required
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase block mb-1">Nome Completo</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: JOÃO SILVA"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase block mb-1">Departamento</label>
                <input 
                  type="text"
                  placeholder="Ex: Dept. 1"
                  value={newEmpDept}
                  onChange={(e) => setNewEmpDept(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/60 uppercase block mb-1">Turno</label>
                <input 
                  type="text"
                  placeholder="Ex: Turno 1"
                  value={newEmpShift}
                  onChange={(e) => setNewEmpShift(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Vincular com Contato / Cliente do Sistema</label>
                <select
                  value={newLinkedClientId}
                  onChange={(e) => setNewLinkedClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">-- Nenhum vínculo --</option>
                  {systemClients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddingEmp(false)} className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-xs font-bold">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary-500 text-slate-950 text-xs font-black uppercase">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
